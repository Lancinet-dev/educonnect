import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { emitToUser } from '../realtime.js'

const router = express.Router()
router.use(authenticate)

async function canAccessClass(user, classId) {
  const { rows } = await query('SELECT id, school_id FROM classes WHERE id = $1', [classId])
  const cls = rows[0]
  if (!cls) return null
  if (user.role === 'super_admin') return cls
  if (cls.school_id !== user.school_id) return null
  if (user.role === 'school_admin') return cls
  if (user.role === 'teacher') {
    const { rows: t } = await query(
      'SELECT 1 FROM class_teachers WHERE class_id = $1 AND teacher_id = $2', [classId, user.id])
    return t[0] ? cls : null
  }
  return null
}

// Charge un devoir et vérifie que l'enseignant/staff peut le gérer
async function ownedHomework(user, homeworkId) {
  const { rows } = await query('SELECT * FROM homework WHERE id = $1', [homeworkId])
  const hw = rows[0]
  if (!hw) return { error: 404 }
  const cls = await canAccessClass(user, hw.class_id)
  if (!cls) return { error: 403 }
  return { hw }
}

const mapHw = (h) => ({
  id: h.id, classId: h.class_id, className: h.class_name,
  subjectId: h.subject_id, subject: h.subject_name, color: h.color,
  title: h.title, description: h.description, dueDate: h.due_date,
  attachmentUrl: h.attachment_url, createdAt: h.created_at,
})

// ── POST /api/homework  (enseignant/staff) ────────────────────
router.post('/', authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { classId, subjectId, title, description, dueDate } = req.body
    const cls = await canAccessClass(req.user, classId)
    if (!cls) return res.status(403).json({ error: 'Accès à cette classe refusé.' })
    if (!title?.trim() || !dueDate) return res.status(400).json({ error: 'Titre et date limite requis.' })

    const { rows } = await query(
      `INSERT INTO homework (school_id, class_id, subject_id, teacher_id, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [cls.school_id, classId, subjectId || null, req.user.id, title.trim(), description?.trim() || null, dueDate]
    )
    const hwId = rows[0].id

    // Notifier élèves de la classe + leurs parents (temps réel)
    const { rows: targets } = await query(
      `SELECT cs.student_id AS id FROM class_students cs WHERE cs.class_id = $1
       UNION
       SELECT ps.parent_id AS id FROM parent_students ps
       JOIN class_students cs ON cs.student_id = ps.student_id WHERE cs.class_id = $1`,
      [classId]
    )
    for (const t of targets) {
      emitToUser(t.id, 'homework:new', { id: hwId, title: title.trim() })
      emitToUser(t.id, 'notification', { type: 'homework', homeworkId: hwId })
    }

    res.status(201).json({ id: hwId })
  } catch (err) { next(err) }
})

// ── GET /api/homework/teacher?classId=  ───────────────────────
router.get('/teacher', authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { classId } = req.query
    const params = []
    let scope
    if (req.user.role === 'teacher') {
      params.push(req.user.id)
      scope = `h.teacher_id = $${params.length}`
    } else {
      params.push(req.user.school_id)
      scope = `h.school_id = $${params.length}`
    }
    if (classId) { params.push(classId); scope += ` AND h.class_id = $${params.length}` }

    const { rows } = await query(
      `SELECT h.*, c.name AS class_name, s.name AS subject_name, s.color,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = h.class_id) AS total_students,
              (SELECT COUNT(*) FROM homework_done hd WHERE hd.homework_id = h.id) AS done_count
       FROM homework h
       JOIN classes c  ON c.id = h.class_id
       LEFT JOIN subjects s ON s.id = h.subject_id
       WHERE ${scope}
       ORDER BY h.due_date DESC, h.created_at DESC`,
      params
    )
    res.json(rows.map(h => ({
      ...mapHw(h),
      totalStudents: parseInt(h.total_students),
      doneCount: parseInt(h.done_count),
      status: new Date(h.due_date) >= new Date(new Date().toDateString()) ? 'upcoming' : 'past',
    })))
  } catch (err) { next(err) }
})

// ── PUT /api/homework/:id  ────────────────────────────────────
router.put('/:id', authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { hw, error } = await ownedHomework(req.user, req.params.id)
    if (error) return res.status(error).json({ error: error === 404 ? 'Devoir introuvable.' : 'Accès refusé.' })
    const { subjectId, title, description, dueDate } = req.body
    await query(
      `UPDATE homework SET subject_id = $1, title = $2, description = $3, due_date = $4 WHERE id = $5`,
      [subjectId ?? hw.subject_id, title?.trim() || hw.title, description?.trim() ?? hw.description, dueDate || hw.due_date, hw.id]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── DELETE /api/homework/:id  ─────────────────────────────────
router.delete('/:id', authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { error } = await ownedHomework(req.user, req.params.id)
    if (error) return res.status(error).json({ error: error === 404 ? 'Devoir introuvable.' : 'Accès refusé.' })
    await query('DELETE FROM homework WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── GET /api/homework/student  ────────────────────────────────
router.get('/student', authorize('student', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT h.*, c.name AS class_name, s.name AS subject_name, s.color,
              (hd.student_id IS NOT NULL) AS done
       FROM homework h
       JOIN class_students cs ON cs.class_id = h.class_id AND cs.student_id = $1
       JOIN classes c ON c.id = h.class_id
       LEFT JOIN subjects s ON s.id = h.subject_id
       LEFT JOIN homework_done hd ON hd.homework_id = h.id AND hd.student_id = $1
       ORDER BY h.due_date ASC`,
      [req.user.id]
    )
    const map = (h) => ({ ...mapHw(h), done: h.done, overdue: !h.done && new Date(h.due_date) < new Date(new Date().toDateString()) })
    res.json({
      todo: rows.filter(h => !h.done).map(map),
      done: rows.filter(h => h.done).map(map),
    })
  } catch (err) { next(err) }
})

// ── POST/DELETE /api/homework/:id/done  (élève) ───────────────
async function studentInHomeworkClass(homeworkId, studentId) {
  const { rows } = await query(
    `SELECT 1 FROM homework h JOIN class_students cs ON cs.class_id = h.class_id
     WHERE h.id = $1 AND cs.student_id = $2`, [homeworkId, studentId])
  return !!rows[0]
}

router.post('/:id/done', authorize('student', 'super_admin'), async (req, res, next) => {
  try {
    if (!(await studentInHomeworkClass(req.params.id, req.user.id)))
      return res.status(403).json({ error: 'Accès refusé.' })
    await query(
      `INSERT INTO homework_done (homework_id, student_id) VALUES ($1, $2)
       ON CONFLICT (homework_id, student_id) DO NOTHING`,
      [req.params.id, req.user.id])
    res.json({ done: true })
  } catch (err) { next(err) }
})

router.delete('/:id/done', authorize('student', 'super_admin'), async (req, res, next) => {
  try {
    await query('DELETE FROM homework_done WHERE homework_id = $1 AND student_id = $2', [req.params.id, req.user.id])
    res.json({ done: false })
  } catch (err) { next(err) }
})

// ── GET /api/homework/parent  ─────────────────────────────────
router.get('/parent', authorize('parent', 'super_admin'), async (req, res, next) => {
  try {
    const { rows: children } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, c.name AS class_name
       FROM parent_students ps JOIN users u ON u.id = ps.student_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE ps.parent_id = $1 ORDER BY u.first_name`,
      [req.user.id]
    )

    const result = []
    for (const c of children) {
      const { rows: hw } = await query(
        `SELECT h.id, h.title, h.due_date, s.name AS subject_name, s.color,
                (hd.student_id IS NOT NULL) AS done
         FROM homework h
         JOIN class_students cs ON cs.class_id = h.class_id AND cs.student_id = $1
         LEFT JOIN subjects s ON s.id = h.subject_id
         LEFT JOIN homework_done hd ON hd.homework_id = h.id AND hd.student_id = $1
         ORDER BY h.due_date ASC`,
        [c.id]
      )
      const today = new Date(new Date().toDateString())
      const pending = hw.filter(h => !h.done)
      const overdue = pending.filter(h => new Date(h.due_date) < today)
      result.push({
        id: c.id, firstName: c.first_name, lastName: c.last_name, avatarUrl: c.avatar_url, className: c.class_name,
        pendingCount: pending.length, overdueCount: overdue.length,
        homework: hw.map(h => ({
          id: h.id, title: h.title, subject: h.subject_name, color: h.color,
          dueDate: h.due_date, done: h.done,
          overdue: !h.done && new Date(h.due_date) < today,
        })),
      })
    }
    res.json({ children: result })
  } catch (err) { next(err) }
})

export default router

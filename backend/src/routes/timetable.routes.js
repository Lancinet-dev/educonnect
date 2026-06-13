import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()
router.use(authenticate)

const staff = authorize('school_admin', 'super_admin')

const mapSlot = (s) => ({
  id: s.id, classId: s.class_id, className: s.class_name,
  subjectId: s.subject_id, subject: s.subject_name, color: s.color,
  teacherId: s.teacher_id, teacherName: s.teacher_first ? `${s.teacher_first} ${s.teacher_last}` : null,
  dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time, room: s.room,
})

const SLOT_SELECT = `
  SELECT ts.id, ts.class_id, ts.subject_id, ts.teacher_id, ts.day_of_week, ts.room,
         to_char(ts.start_time,'HH24:MI') AS start_time,
         to_char(ts.end_time,'HH24:MI')   AS end_time,
         c.name AS class_name, s.name AS subject_name, s.color,
         t.first_name AS teacher_first, t.last_name AS teacher_last
  FROM timetable_slots ts
  JOIN classes c       ON c.id = ts.class_id
  LEFT JOIN subjects s ON s.id = ts.subject_id
  LEFT JOIN users t    ON t.id = ts.teacher_id`

// Détecte un conflit (enseignant déjà pris OU classe déjà occupée) sur un créneau
async function findConflict(schoolId, { classId, teacherId, dayOfWeek, startTime, endTime, excludeId }) {
  // Conflit enseignant : même prof, même jour, horaires qui se chevauchent, autre créneau
  if (teacherId) {
    const { rows } = await query(
      `SELECT ts.id, c.name AS class_name,
              to_char(ts.start_time,'HH24:MI') AS start_time, to_char(ts.end_time,'HH24:MI') AS end_time
       FROM timetable_slots ts JOIN classes c ON c.id = ts.class_id
       WHERE ts.teacher_id = $1 AND ts.day_of_week = $2
         AND ts.id <> $3
         AND ts.start_time < $5 AND ts.end_time > $4`,
      [teacherId, dayOfWeek, excludeId || '00000000-0000-0000-0000-000000000000', startTime, endTime]
    )
    if (rows[0]) return { type: 'teacher', className: rows[0].class_name, start: rows[0].start_time, end: rows[0].end_time }
  }
  // Conflit classe : même classe, même jour, horaires qui se chevauchent
  const { rows: cr } = await query(
    `SELECT id FROM timetable_slots
     WHERE class_id = $1 AND day_of_week = $2 AND id <> $3
       AND start_time < $5 AND end_time > $4`,
    [classId, dayOfWeek, excludeId || '00000000-0000-0000-0000-000000000000', startTime, endTime]
  )
  if (cr[0]) return { type: 'class' }
  return null
}

function validate(body) {
  const { classId, dayOfWeek, startTime, endTime } = body
  if (!classId) return 'Classe requise.'
  if (!(dayOfWeek >= 1 && dayOfWeek <= 7)) return 'Jour invalide.'
  if (!startTime || !endTime) return 'Horaires requis.'
  if (startTime >= endTime) return "L'heure de fin doit être après l'heure de début."
  return null
}

async function classInSchool(classId, schoolId) {
  const { rows } = await query('SELECT school_id FROM classes WHERE id = $1', [classId])
  return rows[0] && rows[0].school_id === schoolId
}

// ── GET /api/timetable/meta ───────────────────────────────────
router.get('/meta', staff, async (req, res, next) => {
  try {
    const sid = req.user.school_id
    const [classes, subjects, teachers] = await Promise.all([
      query('SELECT id, name FROM classes WHERE school_id = $1 ORDER BY name', [sid]),
      query('SELECT id, name, color FROM subjects WHERE school_id = $1 ORDER BY name', [sid]),
      query("SELECT id, first_name, last_name FROM users WHERE school_id = $1 AND role = 'teacher' AND is_active ORDER BY last_name", [sid]),
    ])
    res.json({
      classes: classes.rows.map(c => ({ id: c.id, name: c.name })),
      subjects: subjects.rows.map(s => ({ id: s.id, name: s.name, color: s.color })),
      teachers: teachers.rows.map(t => ({ id: t.id, firstName: t.first_name, lastName: t.last_name })),
    })
  } catch (err) { next(err) }
})

// ── GET /api/timetable/class/:classId ─────────────────────────
router.get('/class/:classId', async (req, res, next) => {
  try {
    const { classId } = req.params
    const u = req.user
    // Contrôle d'accès
    let allowed = u.role === 'super_admin'
    if (!allowed) {
      const { rows } = await query('SELECT school_id FROM classes WHERE id = $1', [classId])
      const cls = rows[0]
      if (!cls || cls.school_id !== u.school_id) return res.status(403).json({ error: 'Accès refusé.' })
      if (u.role === 'school_admin') allowed = true
      else if (u.role === 'teacher') {
        const { rows: t } = await query('SELECT 1 FROM class_teachers WHERE class_id=$1 AND teacher_id=$2', [classId, u.id])
        allowed = !!t[0] || true // les enseignants peuvent consulter n'importe quel EDT de leur école
      } else if (u.role === 'student') {
        const { rows: cs } = await query('SELECT 1 FROM class_students WHERE class_id=$1 AND student_id=$2', [classId, u.id])
        allowed = !!cs[0]
      } else allowed = true // parent/staff même école : lecture seule
    }
    if (!allowed) return res.status(403).json({ error: 'Accès refusé.' })

    const { rows } = await query(
      `${SLOT_SELECT} WHERE ts.class_id = $1 ORDER BY ts.day_of_week, ts.start_time`, [classId])
    res.json(rows.map(mapSlot))
  } catch (err) { next(err) }
})

// ── GET /api/timetable/my-week ────────────────────────────────
// Enseignant : ses cours ; Élève : l'EDT de sa classe
router.get('/my-week', async (req, res, next) => {
  try {
    const u = req.user
    if (u.role === 'teacher') {
      const { rows } = await query(
        `${SLOT_SELECT} WHERE ts.teacher_id = $1 ORDER BY ts.day_of_week, ts.start_time`, [u.id])
      return res.json(rows.map(mapSlot))
    }
    if (u.role === 'student') {
      const { rows } = await query(
        `${SLOT_SELECT}
         WHERE ts.class_id = (SELECT class_id FROM class_students WHERE student_id = $1 ORDER BY joined_at DESC LIMIT 1)
         ORDER BY ts.day_of_week, ts.start_time`, [u.id])
      return res.json(rows.map(mapSlot))
    }
    res.json([])
  } catch (err) { next(err) }
})

// ── GET /api/timetable/teacher/:teacherId  (vue directeur) ────
router.get('/teacher/:teacherId', staff, async (req, res, next) => {
  try {
    const { rows: tr } = await query('SELECT school_id FROM users WHERE id = $1', [req.params.teacherId])
    if (!tr[0] || tr[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Enseignant introuvable.' })
    const { rows } = await query(
      `${SLOT_SELECT} WHERE ts.teacher_id = $1 ORDER BY ts.day_of_week, ts.start_time`, [req.params.teacherId])
    res.json(rows.map(mapSlot))
  } catch (err) { next(err) }
})

// ── POST /api/timetable/slots ─────────────────────────────────
router.post('/slots', staff, async (req, res, next) => {
  try {
    const err = validate(req.body)
    if (err) return res.status(400).json({ error: err })
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body
    if (!(await classInSchool(classId, req.user.school_id))) return res.status(403).json({ error: 'Classe hors de votre école.' })

    const conflict = await findConflict(req.user.school_id, { classId, teacherId, dayOfWeek, startTime, endTime })
    if (conflict) return res.status(409).json({ error: conflictMessage(conflict), conflict })

    const { rows } = await query(
      `INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.user.school_id, classId, subjectId || null, teacherId || null, dayOfWeek, startTime, endTime, room || null])
    res.status(201).json({ id: rows[0].id })
  } catch (err) { next(err) }
})

// ── PUT /api/timetable/slots/:id ──────────────────────────────
router.put('/slots/:id', staff, async (req, res, next) => {
  try {
    const { rows: ex } = await query('SELECT * FROM timetable_slots WHERE id = $1', [req.params.id])
    const slot = ex[0]
    if (!slot || slot.school_id !== req.user.school_id) return res.status(404).json({ error: 'Créneau introuvable.' })

    const merged = {
      classId: slot.class_id,
      subjectId: req.body.subjectId !== undefined ? req.body.subjectId : slot.subject_id,
      teacherId: req.body.teacherId !== undefined ? req.body.teacherId : slot.teacher_id,
      dayOfWeek: req.body.dayOfWeek ?? slot.day_of_week,
      startTime: req.body.startTime ?? slot.start_time,
      endTime: req.body.endTime ?? slot.end_time,
      room: req.body.room !== undefined ? req.body.room : slot.room,
    }
    const err = validate(merged)
    if (err) return res.status(400).json({ error: err })

    const conflict = await findConflict(req.user.school_id, { ...merged, excludeId: slot.id })
    if (conflict) return res.status(409).json({ error: conflictMessage(conflict), conflict })

    await query(
      `UPDATE timetable_slots SET subject_id=$1, teacher_id=$2, day_of_week=$3, start_time=$4, end_time=$5, room=$6 WHERE id=$7`,
      [merged.subjectId || null, merged.teacherId || null, merged.dayOfWeek, merged.startTime, merged.endTime, merged.room || null, slot.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── DELETE /api/timetable/slots/:id ───────────────────────────
router.delete('/slots/:id', staff, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT school_id FROM timetable_slots WHERE id = $1', [req.params.id])
    if (!rows[0] || rows[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Créneau introuvable.' })
    await query('DELETE FROM timetable_slots WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

function conflictMessage(conflict) {
  if (conflict.type === 'teacher') {
    return `Conflit : cet enseignant a déjà cours en ${conflict.className} de ${conflict.start} à ${conflict.end} ce jour-là.`
  }
  return 'Conflit : cette classe a déjà un cours sur ce créneau.'
}

export default router

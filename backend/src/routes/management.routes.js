import express from 'express'
import bcrypt from 'bcrypt'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()
router.use(authenticate, authorize('school_admin', 'super_admin'))

const DEFAULT_PASSWORD = 'Educonnect123!'
const STAFF_ROLES = ['teacher', 'accountant', 'school_admin', 'surveillant']

const dupEmail = (err) => err.code === '23505'

// ════════════════════════════════════════════════════════════
//  ÉLÈVES
// ════════════════════════════════════════════════════════════
router.get('/students', async (req, res, next) => {
  try {
    const { q = '', classId } = req.query
    const params = [req.user.school_id]
    let where = "u.school_id = $1 AND u.role = 'student'"
    if (classId) {
      params.push(classId)
      where += ` AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = u.id AND cs.class_id = $${params.length})`
    }
    if (q.trim()) {
      params.push(`%${q.trim()}%`)
      where += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`
    }
    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.gender, u.phone, u.is_active,
              c.id AS class_id, c.name AS class_name
       FROM users u
       LEFT JOIN LATERAL (
         SELECT cl.id, cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE ${where}
       ORDER BY u.is_active DESC, u.last_name, u.first_name`,
      params
    )
    res.json(rows.map(s => ({
      id: s.id, firstName: s.first_name, lastName: s.last_name, email: s.email,
      gender: s.gender, phone: s.phone, isActive: s.is_active,
      classId: s.class_id, className: s.class_name,
    })))
  } catch (err) { next(err) }
})

router.post('/students', async (req, res, next) => {
  try {
    const { firstName, lastName, gender, email, phone, classId, password } = req.body
    if (!firstName?.trim() || !lastName?.trim()) return res.status(400).json({ error: 'Nom et prénom requis.' })
    const hash = await bcrypt.hash(password || DEFAULT_PASSWORD, 12)
    const { rows } = await query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, gender, phone, password_hash)
       VALUES ($1, 'student', $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.school_id, firstName.trim(), lastName.trim(), email?.trim() || null, gender || null, phone?.trim() || null, hash]
    )
    if (classId) {
      await query('INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [classId, rows[0].id])
    }
    res.status(201).json({ id: rows[0].id, defaultPassword: password ? undefined : DEFAULT_PASSWORD })
  } catch (err) {
    if (dupEmail(err)) return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  }
})

router.put('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows: ex } = await query("SELECT school_id FROM users WHERE id = $1 AND role = 'student'", [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Élève introuvable.' })
    const { firstName, lastName, gender, email, phone, classId } = req.body
    await query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
              gender = $3, email = $4, phone = $5 WHERE id = $6`,
      [firstName?.trim(), lastName?.trim(), gender || null, email?.trim() || null, phone?.trim() || null, id]
    )
    // Réaffectation de classe (si fournie)
    if (classId !== undefined) {
      await query('DELETE FROM class_students WHERE student_id = $1', [id])
      if (classId) await query('INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [classId, id])
    }
    res.json({ ok: true })
  } catch (err) {
    if (dupEmail(err)) return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  }
})

// Activer / désactiver (suppression douce, préserve notes & présences)
router.patch('/students/:id/active', async (req, res, next) => {
  try {
    const { rows: ex } = await query("SELECT school_id FROM users WHERE id = $1 AND role = 'student'", [req.params.id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Élève introuvable.' })
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [!!req.body.isActive, req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ════════════════════════════════════════════════════════════
//  PERSONNEL
// ════════════════════════════════════════════════════════════
router.get('/staff', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, first_name, last_name, email, role, phone, gender, is_active
       FROM users
       WHERE school_id = $1 AND role = ANY($2)
       ORDER BY is_active DESC, role, last_name`,
      [req.user.school_id, STAFF_ROLES]
    )
    res.json(rows.map(s => ({
      id: s.id, firstName: s.first_name, lastName: s.last_name, email: s.email,
      role: s.role, phone: s.phone, gender: s.gender, isActive: s.is_active,
    })))
  } catch (err) { next(err) }
})

router.post('/staff', async (req, res, next) => {
  try {
    const { firstName, lastName, role, email, phone, gender, password } = req.body
    if (!firstName?.trim() || !lastName?.trim()) return res.status(400).json({ error: 'Nom et prénom requis.' })
    if (!STAFF_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide.' })
    if (!email?.trim()) return res.status(400).json({ error: 'Email requis pour le personnel.' })
    const hash = await bcrypt.hash(password || DEFAULT_PASSWORD, 12)
    const { rows } = await query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, phone, gender, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.user.school_id, role, firstName.trim(), lastName.trim(), email.trim(), phone?.trim() || null, gender || null, hash]
    )
    res.status(201).json({ id: rows[0].id, defaultPassword: password ? undefined : DEFAULT_PASSWORD })
  } catch (err) {
    if (dupEmail(err)) return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  }
})

router.put('/staff/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows: ex } = await query('SELECT school_id, role FROM users WHERE id = $1', [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id || !STAFF_ROLES.includes(ex[0].role)) {
      return res.status(404).json({ error: 'Membre du personnel introuvable.' })
    }
    const { firstName, lastName, role, email, phone, gender } = req.body
    if (role && !STAFF_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide.' })
    await query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
              role = COALESCE($3, role), email = $4, phone = $5, gender = $6 WHERE id = $7`,
      [firstName?.trim(), lastName?.trim(), role || null, email?.trim() || null, phone?.trim() || null, gender || null, id]
    )
    res.json({ ok: true })
  } catch (err) {
    if (dupEmail(err)) return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  }
})

router.patch('/staff/:id/active', async (req, res, next) => {
  try {
    const { rows: ex } = await query('SELECT school_id, role FROM users WHERE id = $1', [req.params.id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id || !STAFF_ROLES.includes(ex[0].role)) {
      return res.status(404).json({ error: 'Membre du personnel introuvable.' })
    }
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous désactiver vous-même.' })
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [!!req.body.isActive, req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ════════════════════════════════════════════════════════════
//  NIVEAUX
// ════════════════════════════════════════════════════════════
router.get('/levels', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, name, order_index FROM levels WHERE school_id = $1 ORDER BY order_index', [req.user.school_id])
    res.json(rows.map(l => ({ id: l.id, name: l.name, orderIndex: l.order_index })))
  } catch (err) { next(err) }
})

router.post('/levels', async (req, res, next) => {
  try {
    const { name, orderIndex } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nom du niveau requis.' })
    const { rows } = await query(
      'INSERT INTO levels (school_id, name, order_index) VALUES ($1, $2, $3) RETURNING id',
      [req.user.school_id, name.trim(), orderIndex || 0])
    res.status(201).json({ id: rows[0].id })
  } catch (err) { next(err) }
})

// ════════════════════════════════════════════════════════════
//  CLASSES
// ════════════════════════════════════════════════════════════
router.get('/classes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.max_students, c.room, l.id AS level_id, l.name AS level,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS students,
              (SELECT json_agg(json_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name, 'isMain', ct.is_main))
               FROM class_teachers ct JOIN users u ON u.id = ct.teacher_id WHERE ct.class_id = c.id) AS teachers
       FROM classes c
       LEFT JOIN levels l ON l.id = c.level_id
       WHERE c.school_id = $1
       ORDER BY c.name`,
      [req.user.school_id]
    )
    res.json(rows.map(c => ({
      id: c.id, name: c.name, maxStudents: c.max_students, room: c.room,
      levelId: c.level_id, level: c.level,
      students: parseInt(c.students), teachers: c.teachers || [],
    })))
  } catch (err) { next(err) }
})

router.post('/classes', async (req, res, next) => {
  try {
    const { name, levelId, maxStudents, room } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nom de la classe requis.' })
    const { rows: [yr] } = await query('SELECT id FROM academic_years WHERE school_id = $1 AND is_current LIMIT 1', [req.user.school_id])
    const { rows } = await query(
      `INSERT INTO classes (school_id, level_id, academic_year_id, name, max_students, room)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.school_id, levelId || null, yr?.id || null, name.trim(), maxStudents || 40, room?.trim() || null]
    )
    res.status(201).json({ id: rows[0].id })
  } catch (err) { next(err) }
})

router.put('/classes/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows: ex } = await query('SELECT school_id FROM classes WHERE id = $1', [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Classe introuvable.' })
    const { name, levelId, maxStudents, room } = req.body
    await query(
      'UPDATE classes SET name = COALESCE($1, name), level_id = $2, max_students = COALESCE($3, max_students), room = $4 WHERE id = $5',
      [name?.trim(), levelId || null, maxStudents || null, room?.trim() || null, id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/classes/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows: ex } = await query('SELECT school_id FROM classes WHERE id = $1', [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Classe introuvable.' })
    const { rows: cnt } = await query('SELECT COUNT(*) FROM class_students WHERE class_id = $1', [id])
    if (parseInt(cnt[0].count) > 0) {
      return res.status(409).json({ error: 'Cette classe contient des élèves. Réaffectez-les avant de la supprimer.' })
    }
    await query('DELETE FROM classes WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// Affecter / retirer un enseignant
router.post('/classes/:id/teachers', async (req, res, next) => {
  try {
    const { id } = req.params
    const { teacherId, isMain } = req.body
    const { rows: ex } = await query('SELECT school_id FROM classes WHERE id = $1', [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Classe introuvable.' })
    const { rows: t } = await query("SELECT 1 FROM users WHERE id = $1 AND school_id = $2 AND role = 'teacher'", [teacherId, req.user.school_id])
    if (!t[0]) return res.status(400).json({ error: 'Enseignant invalide.' })
    if (isMain) await query('UPDATE class_teachers SET is_main = FALSE WHERE class_id = $1', [id])
    await query(
      `INSERT INTO class_teachers (class_id, teacher_id, is_main) VALUES ($1, $2, $3)
       ON CONFLICT (class_id, teacher_id) DO UPDATE SET is_main = EXCLUDED.is_main`,
      [id, teacherId, !!isMain])
    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/classes/:id/teachers/:teacherId', async (req, res, next) => {
  try {
    const { id, teacherId } = req.params
    const { rows: ex } = await query('SELECT school_id FROM classes WHERE id = $1', [id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Classe introuvable.' })
    await query('DELETE FROM class_teachers WHERE class_id = $1 AND teacher_id = $2', [id, teacherId])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router

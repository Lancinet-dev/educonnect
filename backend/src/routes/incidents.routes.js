import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()
router.use(authenticate)

const VALID_TYPES = ['retard', 'comportement', 'tenue', 'absence', 'autre']
const TYPE_LABEL = {
  retard: 'Retard', comportement: 'Comportement', tenue: 'Tenue', absence: 'Absence', autre: 'Autre',
}

const mapIncident = (r) => ({
  id: r.id,
  studentId: r.student_id,
  studentName: `${r.first_name} ${r.last_name}`,
  className: r.class_name,
  type: r.type,
  typeLabel: TYPE_LABEL[r.type] || r.type,
  description: r.description,
  date: r.date,
  reportedBy: r.reporter_first ? `${r.reporter_first} ${r.reporter_last}` : null,
})

// ── POST /api/incidents  (surveillant / direction) ────────────
router.post('/', authorize('surveillant', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { studentId, classId, type = 'autre', description, date } = req.body
    if (!studentId) return res.status(400).json({ error: 'Élève requis.' })
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Type d\'incident invalide.' })

    // L'élève doit appartenir à l'école
    const { rows: st } = await query("SELECT school_id FROM users WHERE id = $1 AND role = 'student'", [studentId])
    if (!st[0] || st[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Élève introuvable.' })

    const { rows } = await query(
      `INSERT INTO incidents (school_id, student_id, class_id, reported_by, type, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE)) RETURNING id`,
      [req.user.school_id, studentId, classId || null, req.user.id, type, description?.trim() || null, date || null]
    )
    res.status(201).json({ id: rows[0].id })
  } catch (err) { next(err) }
})

// ── GET /api/incidents/director?classId=  (direction/surveillant) ─
router.get('/director', authorize('surveillant', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const params = [req.user.school_id]
    let filter = ''
    if (req.query.classId) { params.push(req.query.classId); filter = ` AND i.class_id = $${params.length}` }
    const { rows } = await query(
      `SELECT i.*, u.first_name, u.last_name, c.name AS class_name,
              r.first_name AS reporter_first, r.last_name AS reporter_last
       FROM incidents i
       JOIN users u ON u.id = i.student_id
       LEFT JOIN classes c ON c.id = i.class_id
       LEFT JOIN users r ON r.id = i.reported_by
       WHERE i.school_id = $1${filter}
       ORDER BY i.date DESC, i.created_at DESC`,
      params
    )
    res.json(rows.map(mapIncident))
  } catch (err) { next(err) }
})

// ── GET /api/incidents/parent  (parent) ───────────────────────
router.get('/parent', authorize('parent', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.*, u.first_name, u.last_name, c.name AS class_name,
              r.first_name AS reporter_first, r.last_name AS reporter_last
       FROM incidents i
       JOIN users u ON u.id = i.student_id
       JOIN parent_students ps ON ps.student_id = i.student_id AND ps.parent_id = $1
       LEFT JOIN classes c ON c.id = i.class_id
       LEFT JOIN users r ON r.id = i.reported_by
       ORDER BY i.date DESC, i.created_at DESC`,
      [req.user.id]
    )
    res.json(rows.map(mapIncident))
  } catch (err) { next(err) }
})

export default router

import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query, pool } from '../db/pool.js'

const router = express.Router()

const VALID_STATUS = ['present', 'absent', 'late', 'excused']

// Vérifie que l'utilisateur peut accéder à une classe donnée.
// → school_admin/super_admin : même école ; teacher : doit y enseigner.
async function canAccessClass(user, classId) {
  const { rows } = await query('SELECT id, school_id FROM classes WHERE id = $1', [classId])
  const cls = rows[0]
  if (!cls) return null
  if (user.role === 'super_admin') return cls
  if (cls.school_id !== user.school_id) return null
  if (user.role === 'school_admin' || user.role === 'surveillant') return cls
  if (user.role === 'teacher') {
    const { rows: t } = await query(
      'SELECT 1 FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
      [classId, user.id]
    )
    return t[0] ? cls : null
  }
  return null
}

// ── GET /api/attendance/classes ───────────────────────────────
// Classes accessibles à l'utilisateur (pour les sélecteurs)
router.get('/classes', authenticate, authorize('teacher', 'school_admin', 'surveillant', 'super_admin'), async (req, res, next) => {
  try {
    let rows
    if (req.user.role === 'teacher') {
      ;({ rows } = await query(
        `SELECT c.id, c.name, l.name AS level,
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS students
         FROM class_teachers ct
         JOIN classes c ON c.id = ct.class_id
         LEFT JOIN levels l ON l.id = c.level_id
         WHERE ct.teacher_id = $1
         ORDER BY c.name`,
        [req.user.id]
      ))
    } else {
      ;({ rows } = await query(
        `SELECT c.id, c.name, l.name AS level,
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS students
         FROM classes c
         LEFT JOIN levels l ON l.id = c.level_id
         WHERE c.school_id = $1
         ORDER BY c.name`,
        [req.user.school_id]
      ))
    }
    res.json(rows.map(c => ({
      id: c.id, name: c.name, level: c.level, students: parseInt(c.students),
    })))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/attendance/class/:classId?date=YYYY-MM-DD ────────
// Élèves de la classe + leur statut pour la date (défaut : aujourd'hui)
router.get('/class/:classId', authenticate, authorize('teacher', 'school_admin', 'surveillant', 'super_admin'), async (req, res, next) => {
  try {
    const { classId } = req.params
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    const cls = await canAccessClass(req.user, classId)
    if (!cls) return res.status(403).json({ error: 'Accès à cette classe refusé.' })

    const { rows: clsInfo } = await query(
      `SELECT c.name, l.name AS level
       FROM classes c LEFT JOIN levels l ON l.id = c.level_id
       WHERE c.id = $1`,
      [classId]
    )

    const { rows: students } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.gender,
              ar.status
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN attendance_records ar
         ON ar.student_id = u.id AND ar.date = $2
       WHERE cs.class_id = $1
       ORDER BY u.last_name, u.first_name`,
      [classId, date]
    )

    const alreadyRecorded = students.some(s => s.status != null)

    res.json({
      class: { id: classId, name: clsInfo[0]?.name, level: clsInfo[0]?.level },
      date,
      alreadyRecorded,
      students: students.map(s => ({
        id:        s.id,
        firstName: s.first_name,
        lastName:  s.last_name,
        avatarUrl: s.avatar_url,
        gender:    s.gender,
        // défaut « présent » si pas encore d'appel
        status:    s.status || 'present',
      })),
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/attendance/class/:classId ───────────────────────
// Enregistre/met à jour l'appel en lot : { date, records: [{studentId, status}] }
router.post('/class/:classId', authenticate, authorize('teacher', 'school_admin', 'surveillant', 'super_admin'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { classId } = req.params
    const { date, records } = req.body
    const day = date || new Date().toISOString().slice(0, 10)

    const cls = await canAccessClass(req.user, classId)
    if (!cls) {
      client.release()
      return res.status(403).json({ error: 'Accès à cette classe refusé.' })
    }
    if (!Array.isArray(records) || records.length === 0) {
      client.release()
      return res.status(400).json({ error: 'Aucune présence à enregistrer.' })
    }
    for (const r of records) {
      if (!VALID_STATUS.includes(r.status)) {
        client.release()
        return res.status(400).json({ error: `Statut invalide : ${r.status}` })
      }
    }

    await client.query('BEGIN')
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance_records (school_id, student_id, class_id, date, status, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status,
                       class_id = EXCLUDED.class_id,
                       recorded_by = EXCLUDED.recorded_by`,
        [cls.school_id, r.studentId, classId, day, r.status, req.user.id]
      )
    }
    await client.query('COMMIT')

    res.json({ saved: records.length, date: day })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// ── GET /api/attendance/director/stats ────────────────────────
// Statistiques globales pour le directeur (mois en cours + classement)
router.get('/director/stats', authenticate, authorize('school_admin', 'surveillant', 'super_admin'), async (req, res, next) => {
  try {
    const schoolId = req.user.school_id

    // Taux de présence global sur le mois
    const { rows: [month] } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
         COUNT(*) FILTER (WHERE status = 'late')    AS late,
         COUNT(*) AS total
       FROM attendance_records
       WHERE school_id = $1
         AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)`,
      [schoolId]
    )

    // Taux de présence sur les 7 derniers jours
    const { rows: [week] } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) AS total
       FROM attendance_records
       WHERE school_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'`,
      [schoolId]
    )

    // Classement des classes par taux d'absentéisme (mois)
    const { rows: byClass } = await query(
      `SELECT c.id, c.name,
              COUNT(ar.*) FILTER (WHERE ar.status = 'present') AS present,
              COUNT(ar.*) FILTER (WHERE ar.status = 'absent')  AS absent,
              COUNT(ar.*) FILTER (WHERE ar.status = 'late')    AS late,
              COUNT(ar.*) AS total
       FROM classes c
       LEFT JOIN attendance_records ar
         ON ar.class_id = c.id
        AND date_trunc('month', ar.date) = date_trunc('month', CURRENT_DATE)
       WHERE c.school_id = $1
       GROUP BY c.id, c.name
       ORDER BY c.name`,
      [schoolId]
    )

    const rate = (present, total) => total > 0 ? Math.round((present / total) * 100) : null

    const ranking = byClass
      .map(c => {
        const total = parseInt(c.total)
        const absent = parseInt(c.absent)
        const late = parseInt(c.late)
        return {
          id:           c.id,
          name:         c.name,
          present:      parseInt(c.present),
          absent,
          late,
          total,
          presenceRate: rate(parseInt(c.present), total),
          absenceRate:  total > 0 ? Math.round(((absent + late) / total) * 100) : null,
        }
      })
      .sort((a, b) => (b.absenceRate ?? -1) - (a.absenceRate ?? -1))

    res.json({
      month: {
        present: parseInt(month.present) || 0,
        absent:  parseInt(month.absent)  || 0,
        late:    parseInt(month.late)    || 0,
        total:   parseInt(month.total)   || 0,
        presenceRate: rate(parseInt(month.present) || 0, parseInt(month.total) || 0),
      },
      weekPresenceRate: rate(parseInt(week.present) || 0, parseInt(week.total) || 0),
      ranking,
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/attendance/parent ────────────────────────────────
// Calendrier 30 jours + taux annuel pour chaque enfant du parent
router.get('/parent', authenticate, authorize('parent', 'super_admin'), async (req, res, next) => {
  try {
    const parentId = req.user.id

    const { rows: children } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              c.name AS class_name
       FROM parent_students ps
       JOIN users u ON u.id = ps.student_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs
         JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id
         ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE ps.parent_id = $1
       ORDER BY u.first_name`,
      [parentId]
    )

    if (children.length === 0) return res.json({ children: [] })

    const childIds = children.map(c => c.id)

    // Présences des 30 derniers jours
    const { rows: days } = await query(
      `SELECT student_id, to_char(date, 'YYYY-MM-DD') AS date, status
       FROM attendance_records
       WHERE student_id = ANY($1) AND date >= CURRENT_DATE - INTERVAL '29 days'
       ORDER BY date`,
      [childIds]
    )

    // Taux de présence annuel (année civile en cours)
    const { rows: yearly } = await query(
      `SELECT student_id,
              COUNT(*) FILTER (WHERE status = 'present') AS present,
              COUNT(*) AS total
       FROM attendance_records
       WHERE student_id = ANY($1)
         AND date >= date_trunc('year', CURRENT_DATE)
       GROUP BY student_id`,
      [childIds]
    )

    const daysByChild = {}
    for (const d of days) (daysByChild[d.student_id] ||= []).push({ date: d.date, status: d.status })
    const yearlyByChild = {}
    for (const y of yearly) {
      const total = parseInt(y.total)
      yearlyByChild[y.student_id] = total > 0 ? Math.round((parseInt(y.present) / total) * 100) : null
    }

    res.json({
      children: children.map(c => ({
        id:           c.id,
        firstName:    c.first_name,
        lastName:     c.last_name,
        avatarUrl:    c.avatar_url,
        className:    c.class_name,
        presenceRate: yearlyByChild[c.id] ?? null,
        days:         daysByChild[c.id] || [],
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router

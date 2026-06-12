import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

router.use(authenticate, authorize('student', 'super_admin'))

// ── GET /api/student/overview ─────────────────────────────────
// Vue du jour pour l'élève connecté
router.get('/overview', async (req, res, next) => {
  try {
    const studentId = req.user.id

    // 1. Infos élève + classe + présence du jour
    const { rows: [info] } = await query(
      `SELECT
         u.id, u.first_name, u.last_name, u.avatar_url, u.gender,
         c.id   AS class_id,
         c.name AS class_name,
         ar.status AS attendance_today
       FROM users u
       LEFT JOIN LATERAL (
         SELECT cl.id, cl.name
         FROM class_students cs
         JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id
         ORDER BY cs.joined_at DESC
         LIMIT 1
       ) c ON TRUE
       LEFT JOIN attendance_records ar
         ON ar.student_id = u.id AND ar.date = CURRENT_DATE
       WHERE u.id = $1`,
      [studentId]
    )

    // 2. Dernières notes (table vide pour l'instant → [])
    const { rows: grades } = await query(
      `SELECT g.value, g.max_value, g.term, g.evaluation_type, g.graded_at,
              s.name AS subject, s.color
       FROM grades g
       LEFT JOIN subjects s ON s.id = g.subject_id
       WHERE g.student_id = $1
       ORDER BY g.graded_at DESC
       LIMIT 10`,
      [studentId]
    )

    const average = grades.length
      ? Math.round((grades.reduce((sum, g) => sum + (g.value / g.max_value * 20), 0) / grades.length) * 100) / 100
      : null

    // 3. Emploi du temps du jour (selon la classe)
    let timetable = []
    if (info?.class_id) {
      const { rows } = await query(
        `SELECT to_char(ts.start_time, 'HH24:MI') AS start_time,
                to_char(ts.end_time,   'HH24:MI') AS end_time,
                ts.room,
                s.name  AS subject,
                s.color AS color,
                t.first_name AS teacher_first,
                t.last_name  AS teacher_last
         FROM timetable_slots ts
         LEFT JOIN subjects s ON s.id = ts.subject_id
         LEFT JOIN users t    ON t.id = ts.teacher_id
         WHERE ts.class_id = $1
           AND ts.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
         ORDER BY ts.start_time`,
        [info.class_id]
      )
      timetable = rows.map(r => ({
        startTime: r.start_time,
        endTime:   r.end_time,
        room:      r.room,
        subject:   r.subject,
        color:     r.color,
        teacher:   r.teacher_first ? `${r.teacher_first} ${r.teacher_last}` : null,
      }))
    }

    // 4. Résumé financier
    const { rows: [fees] } = await query(
      `SELECT COALESCE(SUM(amount_due), 0)  AS due,
              COALESCE(SUM(amount_paid), 0) AS paid
       FROM fee_invoices WHERE student_id = $1`,
      [studentId]
    )

    res.json({
      student: {
        id:        info.id,
        firstName: info.first_name,
        lastName:  info.last_name,
        avatarUrl: info.avatar_url,
        gender:    info.gender,
        className: info.class_name,
      },
      attendanceToday: info.attendance_today, // 'present' | 'absent' | 'late' | null
      grades: grades.map(g => ({
        subject:   g.subject,
        color:     g.color,
        value:     parseFloat(g.value),
        maxValue:  parseFloat(g.max_value),
        term:      g.term,
        type:      g.evaluation_type,
        gradedAt:  g.graded_at,
      })),
      average,
      timetable,
      homework: [], // module devoirs à venir
      fees: {
        due:     parseFloat(fees.due),
        paid:    parseFloat(fees.paid),
        balance: parseFloat(fees.due) - parseFloat(fees.paid),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router

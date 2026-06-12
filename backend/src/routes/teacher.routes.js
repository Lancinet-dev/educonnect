import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

router.use(authenticate, authorize('teacher', 'super_admin'))

// ── GET /api/teacher/overview ─────────────────────────────────
// Vue du jour pour l'enseignant connecté
router.get('/overview', async (req, res, next) => {
  try {
    const teacherId = req.user.id

    // 1. Classes de l'enseignant + effectifs
    const { rows: classes } = await query(
      `SELECT
         c.id, c.name, c.room, ct.is_main,
         l.name AS level,
         (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS students
       FROM class_teachers ct
       JOIN classes c ON c.id = ct.class_id
       LEFT JOIN levels l ON l.id = c.level_id
       WHERE ct.teacher_id = $1
       ORDER BY c.name`,
      [teacherId]
    )

    // 2. Présences du jour cumulées sur toutes ses classes
    const { rows: [attendance] } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
         COUNT(*) FILTER (WHERE status = 'late')    AS late,
         COUNT(*) AS total
       FROM attendance_records
       WHERE date = CURRENT_DATE
         AND class_id IN (SELECT class_id FROM class_teachers WHERE teacher_id = $1)`,
      [teacherId]
    )

    // 3. Emploi du temps du jour (cours de l'enseignant)
    const { rows: timetable } = await query(
      `SELECT to_char(ts.start_time, 'HH24:MI') AS start_time,
              to_char(ts.end_time,   'HH24:MI') AS end_time,
              ts.room,
              s.name  AS subject,
              s.color AS color,
              c.name  AS class_name
       FROM timetable_slots ts
       LEFT JOIN subjects s ON s.id = ts.subject_id
       LEFT JOIN classes c  ON c.id = ts.class_id
       WHERE ts.teacher_id = $1
         AND ts.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)
       ORDER BY ts.start_time`,
      [teacherId]
    )

    const totalStudents = classes.reduce((sum, c) => sum + parseInt(c.students), 0)

    res.json({
      counts: {
        classes:  classes.length,
        students: totalStudents,
      },
      attendanceToday: {
        present: parseInt(attendance.present) || 0,
        absent:  parseInt(attendance.absent)  || 0,
        late:    parseInt(attendance.late)    || 0,
        total:   parseInt(attendance.total)   || 0,
      },
      classes: classes.map(c => ({
        id:       c.id,
        name:     c.name,
        room:     c.room,
        level:    c.level,
        isMain:   c.is_main,
        students: parseInt(c.students),
      })),
      timetable: timetable.map(t => ({
        startTime: t.start_time,
        endTime:   t.end_time,
        room:      t.room,
        subject:   t.subject,
        color:     t.color,
        className: t.class_name,
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router

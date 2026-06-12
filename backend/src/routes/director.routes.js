import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

// Toutes les routes ici nécessitent d'être directeur (ou super_admin pour debug)
router.use(authenticate, authorize('school_admin', 'super_admin', 'founder'))

// ── GET /api/director/overview ────────────────────────────────
// Vue d'ensemble complète du dashboard directeur
router.get('/overview', async (req, res, next) => {
  try {
    const schoolId = req.user.school_id

    // 1. Chiffres clés : élèves, enseignants, classes
    const { rows: [counts] } = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND is_active = TRUE) AS total_students,
         (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND is_active = TRUE) AS total_teachers,
         (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'parent'  AND is_active = TRUE) AS total_parents,
         (SELECT COUNT(*) FROM classes WHERE school_id = $1) AS total_classes`,
      [schoolId]
    )

    // 2. Présences du jour — élèves
    const { rows: [studentAttendance] } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
         COUNT(*) FILTER (WHERE status = 'late')    AS late,
         COUNT(*) AS total
       FROM attendance_records
       WHERE school_id = $1 AND date = CURRENT_DATE`,
      [schoolId]
    )

    // 3. Présences du jour — personnel
    const { rows: [staffAttendance] } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
         COUNT(*) AS total
       FROM staff_attendance
       WHERE school_id = $1 AND date = CURRENT_DATE`,
      [schoolId]
    )

    // 4. Finances — recettes du mois en cours
    const { rows: [revenue] } = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM fee_payments
       WHERE school_id = $1
         AND date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)`,
      [schoolId]
    )

    // 5. Finances — total impayés
    const { rows: [unpaid] } = await query(
      `SELECT
         COALESCE(SUM(amount_due - amount_paid), 0) AS total_unpaid,
         COUNT(*) FILTER (WHERE status IN ('pending','partial','overdue')) AS invoices_unpaid
       FROM fee_invoices
       WHERE school_id = $1`,
      [schoolId]
    )

    // 6. Liste des élèves absents aujourd'hui (pour affichage détaillé)
    const { rows: absentStudents } = await query(
      `SELECT u.id, u.first_name, u.last_name, c.name AS class_name, ar.status
       FROM attendance_records ar
       JOIN users u ON u.id = ar.student_id
       JOIN classes c ON c.id = ar.class_id
       WHERE ar.school_id = $1 AND ar.date = CURRENT_DATE AND ar.status IN ('absent','late')
       ORDER BY ar.status, u.last_name
       LIMIT 10`,
      [schoolId]
    )

    // 7. Répartition élèves par classe (pour graphique)
    const { rows: classDistribution } = await query(
      `SELECT c.name, c.max_students, COUNT(cs.student_id) AS student_count
       FROM classes c
       LEFT JOIN class_students cs ON cs.class_id = c.id
       WHERE c.school_id = $1
       GROUP BY c.id, c.name, c.max_students
       ORDER BY c.name`,
      [schoolId]
    )

    // 8. Évolution des recettes sur les 6 derniers mois
    const { rows: revenueHistory } = await query(
      `SELECT
         to_char(date_trunc('month', paid_at), 'Mon') AS month,
         date_trunc('month', paid_at) AS month_date,
         SUM(amount) AS total
       FROM fee_payments
       WHERE school_id = $1 AND paid_at >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', paid_at)
       ORDER BY month_date`,
      [schoolId]
    )

    res.json({
      counts: {
        students: parseInt(counts.total_students),
        teachers: parseInt(counts.total_teachers),
        parents:  parseInt(counts.total_parents),
        classes:  parseInt(counts.total_classes),
      },
      attendance: {
        students: {
          present: parseInt(studentAttendance.present) || 0,
          absent:  parseInt(studentAttendance.absent)  || 0,
          late:    parseInt(studentAttendance.late)    || 0,
          total:   parseInt(studentAttendance.total)   || 0,
        },
        staff: {
          present: parseInt(staffAttendance.present) || 0,
          absent:  parseInt(staffAttendance.absent)  || 0,
          total:   parseInt(staffAttendance.total)   || 0,
        }
      },
      finances: {
        revenueThisMonth: parseFloat(revenue.total),
        totalUnpaid:       parseFloat(unpaid.total_unpaid),
        invoicesUnpaid:    parseInt(unpaid.invoices_unpaid),
      },
      absentStudents,
      classDistribution: classDistribution.map(c => ({
        name: c.name,
        students: parseInt(c.student_count),
        capacity: c.max_students
      })),
      revenueHistory: revenueHistory.map(r => ({
        month: r.month,
        total: parseFloat(r.total)
      }))
    })
  } catch (err) {
    next(err)
  }
})

export default router

import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

// Réservé au fondateur (super_admin autorisé pour debug)
router.use(authenticate, authorize('founder', 'super_admin'))

// ── GET /api/founder/overview ─────────────────────────────────
// Vue consolidée de toutes les écoles du réseau du fondateur connecté
router.get('/overview', async (req, res, next) => {
  try {
    // 1. Identifier le réseau du fondateur (via son école de rattachement)
    const { rows: [net] } = await query(
      `SELECT s.network_id, n.name AS network_name
       FROM users u
       JOIN schools s          ON s.id = u.school_id
       LEFT JOIN school_networks n ON n.id = s.network_id
       WHERE u.id = $1`,
      [req.user.id]
    )

    const networkId = net?.network_id

    // Pas de réseau rattaché → réponse vide cohérente
    if (!networkId) {
      return res.json({
        networkName: net?.network_name || null,
        totals: { schools: 0, students: 0, teachers: 0, classes: 0, revenueThisMonth: 0, totalUnpaid: 0 },
        schools: [],
        revenueHistory: [],
        newStudentsThisMonth: 0,
      })
    }

    // 2. Statistiques par école du réseau
    const { rows: schools } = await query(
      `SELECT
         s.id, s.name, s.short_name, s.city, s.plan, s.is_active,
         (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'student' AND is_active = TRUE) AS students,
         (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'teacher' AND is_active = TRUE) AS teachers,
         (SELECT COUNT(*) FROM classes WHERE school_id = s.id) AS classes,
         (SELECT COALESCE(SUM(amount), 0) FROM fee_payments
            WHERE school_id = s.id
              AND date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)) AS revenue_month,
         (SELECT COALESCE(SUM(amount_due - amount_paid), 0) FROM fee_invoices
            WHERE school_id = s.id) AS unpaid
       FROM schools s
       WHERE s.network_id = $1
       ORDER BY s.name`,
      [networkId]
    )

    // 3. Évolution des recettes consolidées sur 6 mois (toutes écoles du réseau)
    const { rows: revenueHistory } = await query(
      `SELECT
         to_char(date_trunc('month', p.paid_at), 'Mon')  AS month,
         date_trunc('month', p.paid_at)                   AS month_date,
         SUM(p.amount)                                    AS total
       FROM fee_payments p
       JOIN schools s ON s.id = p.school_id
       WHERE s.network_id = $1
         AND p.paid_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
       GROUP BY 1, 2
       ORDER BY month_date`,
      [networkId]
    )

    // 4. Croissance : nouvelles inscriptions élèves ce mois (toutes écoles)
    const { rows: [growth] } = await query(
      `SELECT COUNT(*) AS new_students
       FROM users u
       JOIN schools s ON s.id = u.school_id
       WHERE s.network_id = $1
         AND u.role = 'student'
         AND date_trunc('month', u.created_at) = date_trunc('month', CURRENT_DATE)`,
      [networkId]
    )

    // 5. Totaux consolidés
    const totals = schools.reduce((acc, s) => ({
      schools:          acc.schools + 1,
      students:         acc.students + parseInt(s.students),
      teachers:         acc.teachers + parseInt(s.teachers),
      classes:          acc.classes + parseInt(s.classes),
      revenueThisMonth: acc.revenueThisMonth + parseFloat(s.revenue_month),
      totalUnpaid:      acc.totalUnpaid + parseFloat(s.unpaid),
    }), { schools: 0, students: 0, teachers: 0, classes: 0, revenueThisMonth: 0, totalUnpaid: 0 })

    res.json({
      networkName: net.network_name,
      totals,
      schools: schools.map(s => ({
        id:           s.id,
        name:         s.name,
        shortName:    s.short_name,
        city:         s.city,
        plan:         s.plan,
        isActive:     s.is_active,
        students:     parseInt(s.students),
        teachers:     parseInt(s.teachers),
        classes:      parseInt(s.classes),
        revenueMonth: parseFloat(s.revenue_month),
        unpaid:       parseFloat(s.unpaid),
      })),
      revenueHistory: revenueHistory.map(r => ({
        month: r.month,
        total: parseFloat(r.total),
      })),
      newStudentsThisMonth: parseInt(growth.new_students),
    })
  } catch (err) {
    next(err)
  }
})

export default router

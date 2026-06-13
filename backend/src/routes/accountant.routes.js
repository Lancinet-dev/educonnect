import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

router.use(authenticate, authorize('accountant', 'school_admin', 'super_admin'))

// ── GET /api/accountant/overview ──────────────────────────────
// Vue financière de l'école du comptable connecté
router.get('/overview', async (req, res, next) => {
  try {
    const schoolId = req.user.school_id

    // 1. Indicateurs financiers clés
    const { rows: [stats] } = await query(
      `SELECT
         (SELECT COALESCE(SUM(amount), 0) FROM fee_payments
            WHERE school_id = $1
              AND date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)) AS revenue_month,
         (SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE school_id = $1) AS revenue_total,
         (SELECT COALESCE(SUM(amount_due), 0)  FROM fee_invoices WHERE school_id = $1) AS total_due,
         (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_invoices WHERE school_id = $1) AS total_paid,
         (SELECT COUNT(*) FROM fee_invoices
            WHERE school_id = $1 AND status IN ('pending','partial','overdue')) AS invoices_unpaid,
         (SELECT COALESCE(SUM(amount), 0) FROM expenses
            WHERE school_id = $1
              AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)) AS expenses_month`,
      [schoolId]
    )

    // 2. Répartition par moyen de paiement
    const { rows: methods } = await query(
      `SELECT method, COUNT(*) AS count, SUM(amount) AS total
       FROM fee_payments
       WHERE school_id = $1
       GROUP BY method
       ORDER BY total DESC`,
      [schoolId]
    )

    // 3. Derniers paiements reçus
    const { rows: recentPayments } = await query(
      `SELECT p.id, p.amount, p.method, p.paid_at,
              u.first_name, u.last_name, fi.label
       FROM fee_payments p
       JOIN fee_invoices fi ON fi.id = p.invoice_id
       JOIN users u         ON u.id = fi.student_id
       WHERE p.school_id = $1
       ORDER BY p.paid_at DESC
       LIMIT 10`,
      [schoolId]
    )

    // 4. Évolution des recettes sur 6 mois
    const { rows: revenueHistory } = await query(
      `SELECT
         to_char(date_trunc('month', paid_at), 'Mon') AS month,
         date_trunc('month', paid_at) AS month_date,
         SUM(amount) AS total
       FROM fee_payments
       WHERE school_id = $1 AND paid_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
       GROUP BY 1, 2
       ORDER BY month_date`,
      [schoolId]
    )

    const totalDue  = parseFloat(stats.total_due)
    const totalPaid = parseFloat(stats.total_paid)
    const unpaid    = totalDue - totalPaid
    const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

    res.json({
      finances: {
        revenueThisMonth:  parseFloat(stats.revenue_month),
        revenueTotal:      parseFloat(stats.revenue_total),
        expensesThisMonth: parseFloat(stats.expenses_month),
        netBalance:        parseFloat(stats.revenue_month) - parseFloat(stats.expenses_month),
        totalDue,
        totalPaid,
        totalUnpaid:       unpaid,
        invoicesUnpaid:    parseInt(stats.invoices_unpaid),
        collectionRate,
      },
      paymentMethods: methods.map(m => ({
        method: m.method,
        count:  parseInt(m.count),
        total:  parseFloat(m.total),
      })),
      recentPayments: recentPayments.map(p => ({
        id:        p.id,
        amount:    parseFloat(p.amount),
        method:    p.method,
        paidAt:    p.paid_at,
        studentName: `${p.first_name} ${p.last_name}`,
        label:     p.label,
      })),
      revenueHistory: revenueHistory.map(r => ({
        month: r.month,
        total: parseFloat(r.total),
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router

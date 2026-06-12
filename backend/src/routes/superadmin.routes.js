import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

// Réservé au propriétaire de la plateforme SaaS
router.use(authenticate, authorize('super_admin'))

// ── Constante d'abonnement ────────────────────────────────────
// Montant mensuel facturé par école au plan premium (en GNF).
// Modifier ici pour ajuster le calcul du MRR.
const PREMIUM_MONTHLY_PRICE_GNF = 500000

// ── GET /api/superadmin/overview ──────────────────────────────
// Vue globale de toute la plateforme (aucun filtre school_id)
router.get('/overview', async (req, res, next) => {
  try {
    // 1. Comptage des écoles : total, actives, suspendues, par plan
    const { rows: [schoolStats] } = await query(
      `SELECT
         COUNT(*)                                   AS total,
         COUNT(*) FILTER (WHERE is_active)          AS active,
         COUNT(*) FILTER (WHERE NOT is_active)      AS suspended,
         COUNT(*) FILTER (WHERE plan = 'premium')   AS premium,
         COUNT(*) FILTER (WHERE plan = 'free')      AS free
       FROM schools`
    )

    // 2. Nombre total d'utilisateurs (tous rôles confondus)
    const { rows: [userStats] } = await query(
      `SELECT COUNT(*) AS total FROM users`
    )

    // 3. Écoles récemment inscrites (5 dernières)
    const { rows: recentSchools } = await query(
      `SELECT id, name, city, type, plan, is_active, created_at
       FROM schools
       ORDER BY created_at DESC
       LIMIT 5`
    )

    // 4. Croissance plateforme : écoles inscrites par mois (6 derniers mois)
    const { rows: signupHistory } = await query(
      `SELECT
         to_char(date_trunc('month', created_at), 'Mon') AS month,
         date_trunc('month', created_at)                 AS month_date,
         COUNT(*)                                        AS total
       FROM schools
       WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
       GROUP BY 1, 2
       ORDER BY month_date`
    )

    const premiumCount = parseInt(schoolStats.premium)
    const mrr = premiumCount * PREMIUM_MONTHLY_PRICE_GNF

    res.json({
      schools: {
        total:     parseInt(schoolStats.total),
        active:    parseInt(schoolStats.active),
        suspended: parseInt(schoolStats.suspended),
        premium:   premiumCount,
        free:      parseInt(schoolStats.free),
      },
      usersTotal: parseInt(userStats.total),
      mrr,
      premiumPrice: PREMIUM_MONTHLY_PRICE_GNF,
      recentSchools: recentSchools.map(s => ({
        id:        s.id,
        name:      s.name,
        city:      s.city,
        type:      s.type,
        plan:      s.plan,
        isActive:  s.is_active,
        createdAt: s.created_at,
      })),
      signupHistory: signupHistory.map(r => ({
        month: r.month,
        total: parseInt(r.total),
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router

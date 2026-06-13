import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()

// Réservé au propriétaire de la plateforme SaaS
router.use(authenticate, authorize('super_admin'))

// Prix Premium par défaut si le paramètre n'est pas encore défini (en GNF)
const DEFAULT_PREMIUM_PRICE = 500000

// Lit un paramètre plateforme
async function getSetting(key, fallback = null) {
  const { rows } = await query('SELECT value FROM platform_settings WHERE key = $1', [key])
  return rows[0] ? rows[0].value : fallback
}
async function getPremiumPrice() {
  const v = await getSetting('premium_price')
  const n = parseInt(v)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PREMIUM_PRICE
}

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
    const premiumPrice = await getPremiumPrice()
    const mrr = premiumCount * premiumPrice

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
      premiumPrice,
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

// ── GET /api/superadmin/schools ───────────────────────────────
// Toutes les écoles de la plateforme avec leur plan
router.get('/schools', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.name, s.short_name, s.city, s.region, s.type, s.plan, s.is_active, s.created_at,
              (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'student' AND is_active) AS students,
              (SELECT COUNT(*) FROM classes WHERE school_id = s.id) AS classes
       FROM schools s
       ORDER BY s.created_at DESC`
    )
    res.json(rows.map(s => ({
      id: s.id, name: s.name, shortName: s.short_name, city: s.city, region: s.region,
      type: s.type, plan: s.plan, isActive: s.is_active, createdAt: s.created_at,
      students: parseInt(s.students), classes: parseInt(s.classes),
    })))
  } catch (err) { next(err) }
})

// ── PATCH /api/superadmin/schools/:id/plan ────────────────────
// Activer/désactiver le Premium manuellement (en attendant le paiement auto)
router.patch('/schools/:id/plan', async (req, res, next) => {
  try {
    const { plan } = req.body
    if (!['free', 'premium'].includes(plan)) return res.status(400).json({ error: 'Plan invalide.' })
    const maxClasses = plan === 'free' ? 3 : 1000
    const { rows } = await query(
      'UPDATE schools SET plan = $1, max_classes = $2 WHERE id = $3 RETURNING id',
      [plan, maxClasses, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'École introuvable.' })
    res.json({ ok: true, plan })
  } catch (err) { next(err) }
})

// ── GET /api/superadmin/users?q=&role=&schoolId= ──────────────
// Recherche transverse sur toute la plateforme
router.get('/users', async (req, res, next) => {
  try {
    const { q = '', role, schoolId } = req.query
    const params = []
    const conds = []
    if (q.trim()) {
      params.push(`%${q.trim()}%`)
      conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`)
    }
    if (role)     { params.push(role);     conds.push(`u.role = $${params.length}`) }
    if (schoolId) { params.push(schoolId); conds.push(`u.school_id = $${params.length}`) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.last_login,
              s.name AS school_name
       FROM users u LEFT JOIN schools s ON s.id = u.school_id
       ${where}
       ORDER BY u.is_active DESC, u.last_login DESC NULLS LAST
       LIMIT 100`,
      params
    )
    res.json(rows.map(u => ({
      id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email,
      role: u.role, isActive: u.is_active, lastLogin: u.last_login, schoolName: u.school_name,
    })))
  } catch (err) { next(err) }
})

// ── PATCH /api/superadmin/users/:id/active ────────────────────
router.patch('/users/:id/active', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous désactiver vous-même.' })
    const { rows } = await query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id', [!!req.body.isActive, req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── GET /api/superadmin/stats ─────────────────────────────────
// Statistiques d'usage global de la plateforme
router.get('/stats', async (req, res, next) => {
  try {
    const [schoolsByMonth, studentsByMonth, byRole, activity] = await Promise.all([
      query(
        `SELECT to_char(date_trunc('month', created_at), 'Mon') AS month,
                date_trunc('month', created_at) AS d, COUNT(*) AS total
         FROM schools WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY 1, 2 ORDER BY d`
      ),
      query(
        `SELECT to_char(date_trunc('month', created_at), 'Mon') AS month,
                date_trunc('month', created_at) AS d, COUNT(*) AS total
         FROM users WHERE role = 'student' AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY 1, 2 ORDER BY d`
      ),
      query(`SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY total DESC`),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days')  AS active_7,
           COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '30 days') AS active_30,
           COUNT(*) AS total
         FROM users`
      ),
    ])
    res.json({
      schoolsByMonth: schoolsByMonth.rows.map(r => ({ month: r.month, total: parseInt(r.total) })),
      studentsByMonth: studentsByMonth.rows.map(r => ({ month: r.month, total: parseInt(r.total) })),
      usersByRole: byRole.rows.map(r => ({ role: r.role, total: parseInt(r.total) })),
      activity: {
        active7: parseInt(activity.rows[0].active_7),
        active30: parseInt(activity.rows[0].active_30),
        total: parseInt(activity.rows[0].total),
      },
    })
  } catch (err) { next(err) }
})

// ── GET / PATCH /api/superadmin/settings ──────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    res.json({ premiumPrice: await getPremiumPrice() })
  } catch (err) { next(err) }
})

router.patch('/settings', async (req, res, next) => {
  try {
    const { premiumPrice } = req.body
    const n = parseInt(premiumPrice)
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'Prix invalide.' })
    await query(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES ('premium_price', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [String(n)]
    )
    res.json({ premiumPrice: n })
  } catch (err) { next(err) }
})

// ── PATCH /api/superadmin/schools/:id/active ──────────────────
router.patch('/schools/:id/active', async (req, res, next) => {
  try {
    const { rows } = await query(
      'UPDATE schools SET is_active = $1 WHERE id = $2 RETURNING id',
      [!!req.body.isActive, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'École introuvable.' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router

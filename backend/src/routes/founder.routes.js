import express from 'express'
import bcrypt from 'bcrypt'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query, pool } from '../db/pool.js'

const router = express.Router()

// Réservé au fondateur (super_admin autorisé pour debug)
router.use(authenticate, authorize('founder', 'super_admin'))

// Renvoie le network_id du fondateur (le crée et y rattache son école si absent)
async function getOrCreateNetwork(founderId) {
  const { rows: [s] } = await query(
    `SELECT s.id AS school_id, s.network_id, u.first_name, u.last_name
     FROM users u JOIN schools s ON s.id = u.school_id WHERE u.id = $1`,
    [founderId]
  )
  if (!s) return null
  if (s.network_id) return s.network_id
  const { rows: [net] } = await query(
    `INSERT INTO school_networks (name) VALUES ($1) RETURNING id`,
    [`Réseau ${s.first_name} ${s.last_name}`]
  )
  await query('UPDATE schools SET network_id = $1 WHERE id = $2', [net.id, s.school_id])
  return net.id
}

// Vérifie qu'une école appartient bien au réseau du fondateur
async function schoolInFounderNetwork(founderId, schoolId) {
  const { rows } = await query(
    `SELECT s.id, s.network_id FROM schools s
     WHERE s.id = $1 AND s.network_id = (
       SELECT sc.network_id FROM users u JOIN schools sc ON sc.id = u.school_id WHERE u.id = $2
     )`,
    [schoolId, founderId]
  )
  return rows[0] || null
}

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

// ── POST /api/founder/schools ─────────────────────────────────
// Ajoute une école au réseau du fondateur + crée son compte directeur
router.post('/schools', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { school = {}, admin = {} } = req.body
    const { name, type = 'private', city, region, phone, email: schoolEmail, plan = 'free' } = school
    const { firstName, lastName, email, password } = admin

    if (!name?.trim()) { client.release(); return res.status(400).json({ error: "Nom de l'école requis." }) }
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      client.release(); return res.status(400).json({ error: 'Informations du directeur incomplètes.' })
    }
    if (password.length < 8) { client.release(); return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }) }
    if (!['public', 'private'].includes(type)) { client.release(); return res.status(400).json({ error: 'Type invalide.' }) }
    if (!['free', 'premium'].includes(plan)) { client.release(); return res.status(400).json({ error: 'Plan invalide.' }) }

    // Réseau du fondateur (sécurité : la nouvelle école y est rattachée)
    const networkId = await getOrCreateNetwork(req.user.id)
    if (!networkId) { client.release(); return res.status(400).json({ error: 'Réseau introuvable.' }) }

    const shortName = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 5) || 'ECO'
    const maxClasses = plan === 'free' ? 3 : 1000
    const now = new Date()
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1

    await client.query('BEGIN')
    const { rows: [sch] } = await client.query(
      `INSERT INTO schools (network_id, name, short_name, type, plan, city, region, phone, email, max_classes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [networkId, name.trim(), shortName, type, plan, city?.trim() || null, region?.trim() || null,
       phone?.trim() || null, schoolEmail?.trim() || null, maxClasses]
    )
    const schoolId = sch.id
    await client.query(
      `INSERT INTO academic_years (school_id, label, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [schoolId, `${startYear}-${startYear + 1}`, `${startYear}-09-01`, `${startYear + 1}-07-31`]
    )
    const hash = await bcrypt.hash(password, 12)
    await client.query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash)
       VALUES ($1, 'school_admin', $2, $3, $4, $5)`,
      [schoolId, firstName.trim(), lastName.trim(), email.trim().toLowerCase(), hash]
    )
    await client.query('COMMIT')
    res.status(201).json({ id: schoolId })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  } finally {
    client.release()
  }
})

// ── GET /api/founder/schools/:id/detail ───────────────────────
// Vue détaillée d'une école du réseau (supervision)
router.get('/schools/:id/detail', async (req, res, next) => {
  try {
    const { id } = req.params
    const cls = await schoolInFounderNetwork(req.user.id, id)
    if (!cls) return res.status(403).json({ error: 'Cette école ne fait pas partie de votre réseau.' })

    const { rows: [info] } = await query(
      `SELECT name, city, region, type, plan FROM schools WHERE id = $1`, [id])

    const { rows: [counts] } = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND is_active) AS students,
         (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND is_active) AS teachers,
         (SELECT COUNT(*) FROM classes WHERE school_id = $1) AS classes`,
      [id]
    )

    const { rows: classes } = await query(
      `SELECT c.id, c.name, l.name AS level,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS students
       FROM classes c LEFT JOIN levels l ON l.id = c.level_id
       WHERE c.school_id = $1 ORDER BY c.name`,
      [id]
    )

    const { rows: [fin] } = await query(
      `SELECT
         (SELECT COALESCE(SUM(amount),0) FROM fee_payments
            WHERE school_id = $1 AND date_trunc('month',paid_at)=date_trunc('month',CURRENT_DATE)) AS revenue_month,
         (SELECT COALESCE(SUM(amount_due-amount_paid),0) FROM fee_invoices WHERE school_id = $1) AS total_unpaid,
         (SELECT COALESCE(SUM(amount),0) FROM expenses
            WHERE school_id = $1 AND date_trunc('month',date)=date_trunc('month',CURRENT_DATE)) AS expenses_month`,
      [id]
    )

    const { rows: unpaid } = await query(
      `SELECT u.first_name, u.last_name, SUM(fi.amount_due - fi.amount_paid) AS balance
       FROM fee_invoices fi JOIN users u ON u.id = fi.student_id
       WHERE fi.school_id = $1 AND fi.status IN ('pending','partial','overdue')
       GROUP BY u.id, u.first_name, u.last_name
       HAVING SUM(fi.amount_due - fi.amount_paid) > 0
       ORDER BY balance DESC LIMIT 8`,
      [id]
    )

    res.json({
      school: { id, name: info.name, city: info.city, region: info.region, type: info.type, plan: info.plan },
      counts: {
        students: parseInt(counts.students), teachers: parseInt(counts.teachers), classes: parseInt(counts.classes),
      },
      classes: classes.map(c => ({ id: c.id, name: c.name, level: c.level, students: parseInt(c.students) })),
      finances: {
        revenueThisMonth: parseFloat(fin.revenue_month),
        expensesThisMonth: parseFloat(fin.expenses_month),
        netBalance: parseFloat(fin.revenue_month) - parseFloat(fin.expenses_month),
        totalUnpaid: parseFloat(fin.total_unpaid),
      },
      unpaid: unpaid.map(u => ({ name: `${u.first_name} ${u.last_name}`, balance: parseFloat(u.balance) })),
    })
  } catch (err) { next(err) }
})

export default router

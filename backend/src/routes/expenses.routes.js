import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'

const router = express.Router()
router.use(authenticate, authorize('accountant', 'school_admin', 'super_admin'))

const CATEGORIES = ['salaries', 'supplies', 'maintenance', 'utilities', 'transport', 'other']
export const CATEGORY_LABEL = {
  salaries: 'Salaires', supplies: 'Fournitures', maintenance: 'Maintenance',
  utilities: 'Électricité/Eau', transport: 'Transport', other: 'Autre',
}

const mapExpense = (e) => ({
  id: e.id, category: e.category, categoryLabel: CATEGORY_LABEL[e.category] || e.category,
  label: e.label, amount: parseFloat(e.amount), date: e.date, receiptUrl: e.receipt_url,
})

// ── GET /api/expenses?category=&month=&year= ──────────────────
router.get('/', async (req, res, next) => {
  try {
    const { category, month, year } = req.query
    const params = [req.user.school_id]
    let where = 'school_id = $1'
    if (category && CATEGORIES.includes(category)) { params.push(category); where += ` AND category = $${params.length}` }
    if (year)  { params.push(parseInt(year));  where += ` AND EXTRACT(YEAR FROM date) = $${params.length}` }
    if (month) { params.push(parseInt(month)); where += ` AND EXTRACT(MONTH FROM date) = $${params.length}` }

    const { rows } = await query(
      `SELECT * FROM expenses WHERE ${where} ORDER BY date DESC, created_at DESC`, params)
    res.json(rows.map(mapExpense))
  } catch (err) { next(err) }
})

// ── GET /api/expenses/summary?month=&year= ────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date()
    const month = parseInt(req.query.month) || (now.getMonth() + 1)
    const year = parseInt(req.query.year) || now.getFullYear()
    const { rows } = await query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE school_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
       GROUP BY category`,
      [req.user.school_id, month, year])
    const byCategory = rows.map(r => ({ category: r.category, categoryLabel: CATEGORY_LABEL[r.category], total: parseFloat(r.total) }))
    const total = byCategory.reduce((s, c) => s + c.total, 0)
    res.json({ month, year, total, byCategory })
  } catch (err) { next(err) }
})

// ── POST /api/expenses ────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { category = 'other', label, amount, date, receiptUrl } = req.body
    if (!label?.trim()) return res.status(400).json({ error: 'Libellé requis.' })
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Montant invalide.' })
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Catégorie invalide.' })
    const { rows } = await query(
      `INSERT INTO expenses (school_id, category, label, amount, date, receipt_url, recorded_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7) RETURNING id`,
      [req.user.school_id, category, label.trim(), amt, date || null, receiptUrl || null, req.user.id])
    res.status(201).json({ id: rows[0].id })
  } catch (err) { next(err) }
})

// ── PUT /api/expenses/:id ─────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: ex } = await query('SELECT school_id FROM expenses WHERE id = $1', [req.params.id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Dépense introuvable.' })
    const { category, label, amount, date, receiptUrl } = req.body
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Catégorie invalide.' })
    await query(
      `UPDATE expenses SET category = COALESCE($1, category), label = COALESCE($2, label),
              amount = COALESCE($3, amount), date = COALESCE($4, date),
              receipt_url = $5 WHERE id = $6`,
      [category || null, label?.trim() || null, amount != null ? parseFloat(amount) : null, date || null,
       receiptUrl !== undefined ? receiptUrl : null, req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── DELETE /api/expenses/:id ──────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: ex } = await query('SELECT school_id FROM expenses WHERE id = $1', [req.params.id])
    if (!ex[0] || ex[0].school_id !== req.user.school_id) return res.status(404).json({ error: 'Dépense introuvable.' })
    await query('DELETE FROM expenses WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router

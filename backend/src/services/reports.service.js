import { query } from '../db/pool.js'
import { computeClassResults } from './grades.service.js'

const FEE_TYPE_LABEL = {
  tuition: 'Scolarité', transport: 'Transport', cafeteria: 'Cantine', uniform: 'Uniforme', other: 'Autre',
}
const EXP_CAT_LABEL = {
  salaries: 'Salaires', supplies: 'Fournitures', maintenance: 'Maintenance',
  utilities: 'Électricité/Eau', transport: 'Transport', other: 'Autre',
}
const round2 = (n) => Math.round(n * 100) / 100

// ── Rapport financier mensuel d'une école ─────────────────────
export async function financialReport(schoolId, month, year) {
  const { rows: rev } = await query(
    `SELECT fi.type, COALESCE(SUM(p.amount), 0) AS total
     FROM fee_payments p JOIN fee_invoices fi ON fi.id = p.invoice_id
     WHERE p.school_id = $1 AND EXTRACT(MONTH FROM p.paid_at) = $2 AND EXTRACT(YEAR FROM p.paid_at) = $3
     GROUP BY fi.type`,
    [schoolId, month, year]
  )
  const { rows: exp } = await query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE school_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
     GROUP BY category`,
    [schoolId, month, year]
  )
  const { rows: revYear } = await query(
    `SELECT EXTRACT(MONTH FROM paid_at)::int AS m, COALESCE(SUM(amount), 0) AS total
     FROM fee_payments WHERE school_id = $1 AND EXTRACT(YEAR FROM paid_at) = $2 GROUP BY 1`,
    [schoolId, year]
  )
  const { rows: expYear } = await query(
    `SELECT EXTRACT(MONTH FROM date)::int AS m, COALESCE(SUM(amount), 0) AS total
     FROM expenses WHERE school_id = $1 AND EXTRACT(YEAR FROM date) = $2 GROUP BY 1`,
    [schoolId, year]
  )

  const revByMonth = Object.fromEntries(revYear.map(r => [r.m, parseFloat(r.total)]))
  const expByMonth = Object.fromEntries(expYear.map(r => [r.m, parseFloat(r.total)]))
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, revenue: revByMonth[i + 1] || 0, expenses: expByMonth[i + 1] || 0,
  }))

  const revenueByType = rev.map(r => ({ type: r.type, label: FEE_TYPE_LABEL[r.type] || r.type, total: parseFloat(r.total) }))
  const expensesByCategory = exp.map(e => ({ category: e.category, label: EXP_CAT_LABEL[e.category] || e.category, total: parseFloat(e.total) }))
  const revenue = revenueByType.reduce((s, r) => s + r.total, 0)
  const expenses = expensesByCategory.reduce((s, e) => s + e.total, 0)

  return {
    month, year, revenueByType, expensesByCategory,
    totals: { revenue, expenses, net: revenue - expenses },
    monthly,
  }
}

// ── Rapport académique d'une école (par classe) ───────────────
export async function academicReport(schoolId) {
  const { rows: classes } = await query(
    'SELECT id, name FROM classes WHERE school_id = $1 ORDER BY name', [schoolId])

  const result = []
  let allAverages = []
  for (const c of classes) {
    const { byStudent } = await computeClassResults(c.id)
    const averages = Object.values(byStudent).map(s => s.generalAverage).filter(a => a != null)
    const classAverage = averages.length ? round2(averages.reduce((s, a) => s + a, 0) / averages.length) : null
    const passed = averages.filter(a => a >= 10).length
    const successRate = averages.length ? Math.round((passed / averages.length) * 100) : null
    result.push({ id: c.id, name: c.name, average: classAverage, successRate, students: averages.length })
    allAverages = allAverages.concat(averages)
  }

  const schoolAverage = allAverages.length ? round2(allAverages.reduce((s, a) => s + a, 0) / allAverages.length) : null
  const overallSuccessRate = allAverages.length ? Math.round((allAverages.filter(a => a >= 10).length / allAverages.length) * 100) : null

  return {
    classes: result.sort((a, b) => (b.average ?? -1) - (a.average ?? -1)),
    schoolAverage, overallSuccessRate, gradedStudents: allAverages.length,
  }
}

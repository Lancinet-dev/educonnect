import express from 'express'
import PDFDocument from 'pdfkit'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { financialReport, academicReport } from '../services/reports.service.js'

const router = express.Router()
router.use(authenticate)

const MONTHS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const BRAND = '#6366f1'
const gnf = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' GNF'

const staff = authorize('accountant', 'school_admin', 'super_admin')
const director = authorize('school_admin', 'super_admin')

const monthYear = (req) => {
  const now = new Date()
  return { month: parseInt(req.query.month) || (now.getMonth() + 1), year: parseInt(req.query.year) || now.getFullYear() }
}

async function schoolName(schoolId) {
  const { rows } = await query('SELECT name FROM schools WHERE id = $1', [schoolId])
  return rows[0]?.name || 'EduConnect'
}

// Rend un tableau simple à 2 colonnes (libellé / montant)
function pdfTable(doc, title, rows, valueFmt = gnf) {
  doc.moveDown(0.8)
  doc.fontSize(12).fillColor(BRAND).text(title)
  doc.moveDown(0.3)
  const left = doc.page.margins.left
  const width = doc.page.width - left - doc.page.margins.right
  rows.forEach(r => {
    const y = doc.y
    doc.fontSize(10).fillColor('#333').text(r.label, left, y)
    doc.fillColor('#111').text(valueFmt(r.total), left, y, { width, align: 'right' })
    doc.moveDown(0.2)
  })
}

// ── GET /api/reports/financial ────────────────────────────────
router.get('/financial', staff, async (req, res, next) => {
  try {
    const { month, year } = monthYear(req)
    res.json(await financialReport(req.user.school_id, month, year))
  } catch (err) { next(err) }
})

// ── GET /api/reports/financial.pdf ────────────────────────────
router.get('/financial.pdf', staff, async (req, res, next) => {
  try {
    const { month, year } = monthYear(req)
    const data = await financialReport(req.user.school_id, month, year)
    const name = await schoolName(req.user.school_id)

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="rapport-financier-${MONTHS[month]}-${year}.pdf"`)
    doc.pipe(res)

    doc.fontSize(20).fillColor(BRAND).text(name, { align: 'center' })
    doc.fontSize(13).fillColor('#111').text('Rapport financier mensuel', { align: 'center' })
    doc.fontSize(10).fillColor('#666').text(`${MONTHS[month]} ${year}`, { align: 'center' })
    doc.moveDown(0.5)

    pdfTable(doc, 'Recettes par type', data.revenueByType.length ? data.revenueByType : [{ label: 'Aucune recette', total: 0 }])
    pdfTable(doc, 'Dépenses par catégorie', data.expensesByCategory.length ? data.expensesByCategory : [{ label: 'Aucune dépense', total: 0 }])

    doc.moveDown(1)
    const left = doc.page.margins.left
    const width = doc.page.width - left - doc.page.margins.right
    doc.rect(left, doc.y, width, 70).fill('#f5f3ff')
    let y = doc.y + 12
    doc.fontSize(11).fillColor('#333').text('Total recettes', left + 14, y)
    doc.fillColor('#111').text(gnf(data.totals.revenue), left, y, { width: width - 14, align: 'right' })
    y += 18
    doc.fillColor('#333').text('Total dépenses', left + 14, y)
    doc.fillColor('#111').text(gnf(data.totals.expenses), left, y, { width: width - 14, align: 'right' })
    y += 20
    doc.fontSize(13).fillColor(data.totals.net >= 0 ? '#059669' : '#dc2626')
    doc.text('Solde net', left + 14, y)
    doc.text(gnf(data.totals.net), left, y, { width: width - 14, align: 'right' })

    doc.moveDown(5)
    doc.fontSize(8).fillColor('#999').text('Document généré automatiquement par EduConnect.', { align: 'center' })
    doc.end()
  } catch (err) { next(err) }
})

// ── GET /api/reports/academic ─────────────────────────────────
router.get('/academic', director, async (req, res, next) => {
  try {
    res.json(await academicReport(req.user.school_id))
  } catch (err) { next(err) }
})

// ── GET /api/reports/academic.pdf ─────────────────────────────
router.get('/academic.pdf', director, async (req, res, next) => {
  try {
    const data = await academicReport(req.user.school_id)
    const name = await schoolName(req.user.school_id)

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-academique.pdf"')
    doc.pipe(res)

    doc.fontSize(20).fillColor(BRAND).text(name, { align: 'center' })
    doc.fontSize(13).fillColor('#111').text('Rapport académique', { align: 'center' })
    doc.fontSize(10).fillColor('#666').text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
    doc.moveDown(1)

    const left = doc.page.margins.left
    const w = doc.page.width - left - doc.page.margins.right
    // En-tête de tableau
    let y = doc.y
    doc.rect(left, y, w, 22).fill(BRAND)
    doc.fillColor('#fff').fontSize(10)
    doc.text('Classe', left + 8, y + 6)
    doc.text('Moyenne', left + 220, y + 6)
    doc.text('Réussite (≥10)', left + 320, y + 6)
    doc.text('Élèves', left + 440, y + 6)
    y += 22
    data.classes.forEach(c => {
      doc.rect(left, y, w, 20).strokeColor('#e4e4e7').stroke()
      doc.fillColor('#111').fontSize(10)
      doc.text(c.name, left + 8, y + 5)
      doc.text(c.average != null ? `${c.average}/20` : '—', left + 220, y + 5)
      doc.text(c.successRate != null ? `${c.successRate}%` : '—', left + 320, y + 5)
      doc.text(String(c.students), left + 440, y + 5)
      y += 20
    })
    doc.y = y + 16
    doc.fontSize(12).fillColor(BRAND)
    doc.text(`Moyenne générale de l'école : ${data.schoolAverage != null ? data.schoolAverage + '/20' : '—'}`, { align: 'right' })
    doc.fontSize(11).fillColor('#111')
    doc.text(`Taux de réussite global : ${data.overallSuccessRate != null ? data.overallSuccessRate + '%' : '—'}`, { align: 'right' })

    doc.moveDown(4)
    doc.fontSize(8).fillColor('#999').text('Document généré automatiquement par EduConnect.', { align: 'center' })
    doc.end()
  } catch (err) { next(err) }
})

// ── GET /api/reports/founder ──────────────────────────────────
// Vue consolidée multi-écoles du réseau du fondateur
router.get('/founder', authorize('founder', 'super_admin'), async (req, res, next) => {
  try {
    const { month, year } = monthYear(req)
    const { rows: [net] } = await query(
      `SELECT s.network_id, n.name AS network_name
       FROM users u JOIN schools s ON s.id = u.school_id
       LEFT JOIN school_networks n ON n.id = s.network_id WHERE u.id = $1`,
      [req.user.id]
    )
    if (!net?.network_id) return res.json({ networkName: null, schools: [] })

    const { rows: schools } = await query(
      'SELECT id, name, short_name, city, plan FROM schools WHERE network_id = $1 ORDER BY name', [net.network_id])

    const result = []
    for (const s of schools) {
      const fin = await financialReport(s.id, month, year)
      const aca = await academicReport(s.id)
      result.push({
        id: s.id, name: s.name, shortName: s.short_name, city: s.city, plan: s.plan,
        revenue: fin.totals.revenue, expenses: fin.totals.expenses, net: fin.totals.net,
        schoolAverage: aca.schoolAverage, successRate: aca.overallSuccessRate,
      })
    }
    res.json({ networkName: net.network_name, month, year, schools: result })
  } catch (err) { next(err) }
})

export default router

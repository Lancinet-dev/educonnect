import express from 'express'
import PDFDocument from 'pdfkit'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query, pool } from '../db/pool.js'

const router = express.Router()

const FEE_TYPES = ['tuition', 'transport', 'cafeteria', 'uniform', 'other']
const METHODS   = ['cash', 'orange_money', 'mtn_money', 'bank', 'other']
const TYPE_LABEL = {
  tuition: 'Scolarité', transport: 'Transport', cafeteria: 'Cantine',
  uniform: 'Uniforme', other: 'Autre',
}
const METHOD_LABEL = {
  cash: 'Espèces', orange_money: 'Orange Money', mtn_money: 'MTN Money',
  bank: 'Virement bancaire', other: 'Autre',
}

const staff = authorize('accountant', 'school_admin', 'super_admin')

// Génère le prochain numéro de reçu (atomique) dans une transaction
async function nextReceiptNumber(client, schoolId, year) {
  const { rows: [c] } = await client.query(
    `INSERT INTO receipt_counters (school_id, year, last_seq) VALUES ($1, $2, 1)
     ON CONFLICT (school_id, year) DO UPDATE SET last_seq = receipt_counters.last_seq + 1
     RETURNING last_seq`,
    [schoolId, year]
  )
  const { rows: [s] } = await client.query(
    `SELECT COALESCE(NULLIF(short_name,''), UPPER(LEFT(name,3))) AS code FROM schools WHERE id = $1`,
    [schoolId]
  )
  return `REC-${s.code}-${year}-${String(c.last_seq).padStart(4, '0')}`
}

// ── GET /api/finance/classes ──────────────────────────────────
// Classes & niveaux de l'école (sélecteurs comptable)
router.get('/classes', authenticate, staff, async (req, res, next) => {
  try {
    const { rows: classes } = await query(
      `SELECT c.id, c.name, l.name AS level
       FROM classes c LEFT JOIN levels l ON l.id = c.level_id
       WHERE c.school_id = $1 ORDER BY c.name`,
      [req.user.school_id]
    )
    const { rows: levels } = await query(
      `SELECT id, name FROM levels WHERE school_id = $1 ORDER BY order_index`,
      [req.user.school_id]
    )
    res.json({
      classes: classes.map(c => ({ id: c.id, name: c.name, level: c.level })),
      levels:  levels.map(l => ({ id: l.id, name: l.name })),
    })
  } catch (err) { next(err) }
})

// ── GET /api/finance/students?q=&classId= ─────────────────────
router.get('/students', authenticate, staff, async (req, res, next) => {
  try {
    const { q = '', classId } = req.query
    const params = [req.user.school_id]
    let where = 'u.school_id = $1 AND u.role = \'student\''
    if (classId) {
      params.push(classId)
      where += ` AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = u.id AND cs.class_id = $${params.length})`
    }
    if (q.trim()) {
      params.push(`%${q.trim()}%`)
      where += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`
    }

    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              c.name AS class_name,
              COALESCE(SUM(fi.amount_due), 0)  AS total_due,
              COALESCE(SUM(fi.amount_paid), 0) AS total_paid
       FROM users u
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       LEFT JOIN fee_invoices fi ON fi.student_id = u.id
       WHERE ${where}
       GROUP BY u.id, c.name
       ORDER BY u.last_name, u.first_name
       LIMIT 100`,
      params
    )
    res.json(rows.map(s => ({
      id: s.id, firstName: s.first_name, lastName: s.last_name, avatarUrl: s.avatar_url,
      className: s.class_name,
      totalDue: parseFloat(s.total_due), totalPaid: parseFloat(s.total_paid),
      balance: parseFloat(s.total_due) - parseFloat(s.total_paid),
    })))
  } catch (err) { next(err) }
})

// Détail facturation d'un élève (factures + paiements)
async function studentInvoices(studentId) {
  const { rows: invoices } = await query(
    `SELECT id, type, label, amount_due, amount_paid, due_date, status, created_at
     FROM fee_invoices WHERE student_id = $1 ORDER BY created_at DESC`,
    [studentId]
  )
  const { rows: payments } = await query(
    `SELECT p.id, p.invoice_id, p.amount, p.method, p.reference, p.receipt_number, p.paid_at
     FROM fee_payments p
     JOIN fee_invoices fi ON fi.id = p.invoice_id
     WHERE fi.student_id = $1 ORDER BY p.paid_at DESC`,
    [studentId]
  )
  return {
    invoices: invoices.map(i => ({
      id: i.id, type: i.type, typeLabel: TYPE_LABEL[i.type] || i.type, label: i.label,
      amountDue: parseFloat(i.amount_due), amountPaid: parseFloat(i.amount_paid),
      balance: parseFloat(i.amount_due) - parseFloat(i.amount_paid),
      dueDate: i.due_date, status: i.status,
    })),
    payments: payments.map(p => ({
      id: p.id, invoiceId: p.invoice_id, amount: parseFloat(p.amount),
      method: p.method, methodLabel: METHOD_LABEL[p.method] || p.method,
      reference: p.reference, receiptNumber: p.receipt_number, paidAt: p.paid_at,
    })),
  }
}

// ── GET /api/finance/students/:id/invoices ────────────────────
router.get('/students/:id/invoices', authenticate, staff, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT first_name, last_name, school_id FROM users WHERE id = $1`, [req.params.id]
    )
    if (!rows[0] || rows[0].school_id !== req.user.school_id) {
      return res.status(404).json({ error: 'Élève introuvable.' })
    }
    const data = await studentInvoices(req.params.id)
    res.json({ student: { id: req.params.id, firstName: rows[0].first_name, lastName: rows[0].last_name }, ...data })
  } catch (err) { next(err) }
})

// ── POST /api/finance/invoices/:invoiceId/payments ────────────
router.post('/invoices/:invoiceId/payments', authenticate, staff, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { invoiceId } = req.params
    const { amount, method = 'cash', reference = null } = req.body
    const amt = parseFloat(amount)

    if (!amt || amt <= 0) { client.release(); return res.status(400).json({ error: 'Montant invalide.' }) }
    if (!METHODS.includes(method)) { client.release(); return res.status(400).json({ error: 'Méthode invalide.' }) }

    const { rows: invRows } = await client.query('SELECT * FROM fee_invoices WHERE id = $1', [invoiceId])
    const inv = invRows[0]
    if (!inv || inv.school_id !== req.user.school_id) {
      client.release(); return res.status(404).json({ error: 'Facture introuvable.' })
    }

    await client.query('BEGIN')

    const receiptNumber = await nextReceiptNumber(client, inv.school_id, new Date().getFullYear())

    const { rows: payRows } = await client.query(
      `INSERT INTO fee_payments (invoice_id, school_id, amount, method, reference, received_by, receipt_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, paid_at`,
      [invoiceId, inv.school_id, amt, method, reference, req.user.id, receiptNumber]
    )

    // Recalcul du montant payé + statut de la facture
    await client.query(
      `UPDATE fee_invoices fi
       SET amount_paid = sub.total,
           status = (CASE WHEN sub.total >= fi.amount_due THEN 'paid'
                          WHEN sub.total > 0 THEN 'partial' ELSE 'pending' END)::payment_status
       FROM (SELECT COALESCE(SUM(amount), 0) AS total FROM fee_payments WHERE invoice_id = $1) sub
       WHERE fi.id = $1`,
      [invoiceId]
    )

    await client.query('COMMIT')

    const { rows: [updated] } = await query(
      'SELECT amount_paid, status FROM fee_invoices WHERE id = $1', [invoiceId]
    )
    res.status(201).json({
      payment: { id: payRows[0].id, amount: amt, method, reference, receiptNumber, paidAt: payRows[0].paid_at },
      invoice: { id: invoiceId, amountPaid: parseFloat(updated.amount_paid), status: updated.status },
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// ── POST /api/finance/invoices ────────────────────────────────
// Crée une facture pour un élève, une classe ou un niveau
router.post('/invoices', authenticate, staff, async (req, res, next) => {
  try {
    const { studentId, classId, levelId, type = 'tuition', label, amount, dueDate } = req.body
    const amt = parseFloat(amount)
    if (!label?.trim()) return res.status(400).json({ error: 'Libellé requis.' })
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Montant invalide.' })
    if (!FEE_TYPES.includes(type)) return res.status(400).json({ error: 'Type de frais invalide.' })
    if (!studentId && !classId && !levelId) return res.status(400).json({ error: 'Choisissez un élève, une classe ou un niveau.' })

    // Année scolaire courante
    const { rows: [yr] } = await query(
      `SELECT id FROM academic_years WHERE school_id = $1 AND is_current LIMIT 1`, [req.user.school_id]
    )

    // Résoudre la liste des élèves cibles
    let studentIds = []
    if (studentId) {
      studentIds = [studentId]
    } else if (classId) {
      const { rows } = await query('SELECT student_id FROM class_students WHERE class_id = $1', [classId])
      studentIds = rows.map(r => r.student_id)
    } else if (levelId) {
      const { rows } = await query(
        `SELECT cs.student_id FROM class_students cs
         JOIN classes c ON c.id = cs.class_id WHERE c.level_id = $1`, [levelId]
      )
      studentIds = rows.map(r => r.student_id)
    }
    if (studentIds.length === 0) return res.status(400).json({ error: 'Aucun élève ciblé.' })

    let created = 0
    for (const sid of studentIds) {
      await query(
        `INSERT INTO fee_invoices (school_id, student_id, academic_year_id, type, label, amount_due, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [req.user.school_id, sid, yr?.id || null, type, label.trim(), amt, dueDate || null]
      )
      created++
    }
    res.status(201).json({ created })
  } catch (err) { next(err) }
})

// ── GET /api/finance/receipt/:paymentId  (PDF) ────────────────
router.get('/receipt/:paymentId', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.amount, p.method, p.reference, p.receipt_number, p.paid_at,
              fi.label, fi.student_id,
              u.first_name, u.last_name, u.school_id,
              s.name AS school_name,
              c.name AS class_name
       FROM fee_payments p
       JOIN fee_invoices fi ON fi.id = p.invoice_id
       JOIN users u ON u.id = fi.student_id
       LEFT JOIN schools s ON s.id = u.school_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE p.id = $1`,
      [req.params.paymentId]
    )
    const pay = rows[0]
    if (!pay) return res.status(404).json({ error: 'Paiement introuvable.' })

    // Contrôle d'accès : staff de l'école, ou parent de l'élève
    const u = req.user
    let allowed = u.role === 'super_admin'
      || (['accountant', 'school_admin'].includes(u.role) && pay.school_id === u.school_id)
    if (!allowed && u.role === 'parent') {
      const { rows: pr } = await query(
        'SELECT 1 FROM parent_students WHERE parent_id = $1 AND student_id = $2', [u.id, pay.student_id]
      )
      allowed = !!pr[0]
    }
    if (!allowed && u.role === 'student') allowed = u.id === pay.student_id
    if (!allowed) return res.status(403).json({ error: 'Accès refusé.' })

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="recu-${pay.receipt_number}.pdf"`)
    doc.pipe(res)

    const BRAND = '#6366f1'
    const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' GNF'

    doc.fontSize(20).fillColor(BRAND).text(pay.school_name || 'EduConnect', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(14).fillColor('#111').text('Reçu de paiement', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(11).fillColor(BRAND).text(pay.receipt_number, { align: 'center' })
    doc.moveDown(1.5)

    doc.fontSize(11).fillColor('#111')
    const line = (k, v) => { doc.fillColor('#666').text(k, { continued: true }).fillColor('#111').text('  ' + v) }
    line('Élève :', `${pay.first_name} ${pay.last_name}`)
    line('Classe :', pay.class_name || '—')
    line('Motif :', pay.label)
    line('Méthode :', METHOD_LABEL[pay.method] || pay.method)
    if (pay.reference) line('Référence :', pay.reference)
    line('Date :', new Date(pay.paid_at).toLocaleDateString('fr-FR'))
    doc.moveDown(1)

    // Montant en évidence
    const y = doc.y
    doc.rect(50, y, 495, 50).fill('#f5f3ff')
    doc.fillColor('#666').fontSize(11).text('Montant payé', 66, y + 10)
    doc.fillColor(BRAND).fontSize(22).text(fmt(parseFloat(pay.amount)), 66, y + 24)

    doc.moveDown(5)
    doc.fontSize(8).fillColor('#999').text('Reçu généré automatiquement par EduConnect. Conservez ce document.', { align: 'center' })
    doc.end()
  } catch (err) { next(err) }
})

// ── GET /api/finance/director  (recettes par type + impayés) ──
router.get('/director', authenticate, authorize('school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const schoolId = req.user.school_id
    const { classId } = req.query

    // Recettes par type de frais (paiements reliés à leur facture)
    const { rows: byType } = await query(
      `SELECT fi.type, COALESCE(SUM(p.amount), 0) AS total
       FROM fee_payments p
       JOIN fee_invoices fi ON fi.id = p.invoice_id
       WHERE p.school_id = $1
       GROUP BY fi.type
       ORDER BY total DESC`,
      [schoolId]
    )

    // Liste des élèves avec impayés (filtrable par classe)
    const params = [schoolId]
    let classFilter = ''
    if (classId) {
      params.push(classId)
      classFilter = ` AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.student_id = u.id AND cs.class_id = $${params.length})`
    }
    const { rows: unpaid } = await query(
      `SELECT u.id, u.first_name, u.last_name,
              c.name AS class_name,
              SUM(fi.amount_due - fi.amount_paid) AS balance
       FROM fee_invoices fi
       JOIN users u ON u.id = fi.student_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE fi.school_id = $1 AND fi.status IN ('pending','partial','overdue')${classFilter}
       GROUP BY u.id, c.name
       HAVING SUM(fi.amount_due - fi.amount_paid) > 0
       ORDER BY balance DESC`,
      params
    )

    res.json({
      revenueByType: byType.map(r => ({ type: r.type, typeLabel: TYPE_LABEL[r.type] || r.type, total: parseFloat(r.total) })),
      unpaid: unpaid.map(u => ({
        id: u.id, firstName: u.first_name, lastName: u.last_name,
        className: u.class_name, balance: parseFloat(u.balance),
      })),
    })
  } catch (err) { next(err) }
})

// ── GET /api/finance/director/unpaid.csv ──────────────────────
router.get('/director/unpaid.csv', authenticate, authorize('school_admin', 'super_admin'), async (req, res, next) => {
  try {
    // Fonctionnalité Premium
    const { rows: [sch] } = await query('SELECT plan FROM schools WHERE id = $1', [req.user.school_id])
    if (sch && sch.plan === 'free') {
      return res.status(403).json({ error: "L'export CSV est une fonctionnalité Premium.", code: 'PREMIUM_ONLY' })
    }
    const { rows } = await query(
      `SELECT u.first_name, u.last_name, c.name AS class_name,
              SUM(fi.amount_due - fi.amount_paid) AS balance
       FROM fee_invoices fi
       JOIN users u ON u.id = fi.student_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE fi.school_id = $1 AND fi.status IN ('pending','partial','overdue')
       GROUP BY u.id, u.first_name, u.last_name, c.name
       HAVING SUM(fi.amount_due - fi.amount_paid) > 0
       ORDER BY balance DESC`,
      [req.user.school_id]
    )
    const header = 'Prénom,Nom,Classe,Solde dû (GNF)\n'
    const body = rows.map(r =>
      `${r.first_name},${r.last_name},${r.class_name || ''},${parseFloat(r.balance)}`
    ).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="impayes.csv"')
    res.send('﻿' + header + body)
  } catch (err) { next(err) }
})

// ── GET /api/finance/parent  (factures + paiements des enfants) ─
router.get('/parent', authenticate, authorize('parent', 'super_admin'), async (req, res, next) => {
  try {
    const { rows: children } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              c.name AS class_name
       FROM parent_students ps
       JOIN users u ON u.id = ps.student_id
       LEFT JOIN LATERAL (
         SELECT cl.name FROM class_students cs JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id ORDER BY cs.joined_at DESC LIMIT 1
       ) c ON TRUE
       WHERE ps.parent_id = $1 ORDER BY u.first_name`,
      [req.user.id]
    )

    const result = []
    for (const c of children) {
      const data = await studentInvoices(c.id)
      const balance = data.invoices.reduce((s, i) => s + i.balance, 0)
      result.push({
        id: c.id, firstName: c.first_name, lastName: c.last_name,
        avatarUrl: c.avatar_url, className: c.class_name, balance, ...data,
      })
    }
    res.json({ children: result })
  } catch (err) { next(err) }
})

export default router

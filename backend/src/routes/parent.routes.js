import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { getStudentResults } from '../services/grades.service.js'

const router = express.Router()

router.use(authenticate, authorize('parent', 'super_admin'))

// ── GET /api/parent/overview ──────────────────────────────────
// Tous les enfants du parent connecté avec leurs données du jour
router.get('/overview', async (req, res, next) => {
  try {
    const parentId = req.user.id

    // 1. Enfants + classe + présence du jour + résumé financier
    const { rows: children } = await query(
      `SELECT
         u.id, u.first_name, u.last_name, u.avatar_url, u.gender,
         ps.relation,
         c.id   AS class_id,
         c.name AS class_name,
         ar.status AS attendance_today,
         COALESCE(fi.total_due, 0)  AS total_due,
         COALESCE(fi.total_paid, 0) AS total_paid
       FROM parent_students ps
       JOIN users u ON u.id = ps.student_id
       LEFT JOIN LATERAL (
         SELECT cl.id, cl.name
         FROM class_students cs
         JOIN classes cl ON cl.id = cs.class_id
         WHERE cs.student_id = u.id
         ORDER BY cs.joined_at DESC
         LIMIT 1
       ) c ON TRUE
       LEFT JOIN attendance_records ar
         ON ar.student_id = u.id AND ar.date = CURRENT_DATE
       LEFT JOIN LATERAL (
         SELECT SUM(amount_due) AS total_due, SUM(amount_paid) AS total_paid
         FROM fee_invoices WHERE student_id = u.id
       ) fi ON TRUE
       WHERE ps.parent_id = $1
       ORDER BY u.first_name`,
      [parentId]
    )

    if (children.length === 0) {
      return res.json({ children: [], messages: [] })
    }

    const childIds = children.map(c => c.id)

    // 2. Moyennes & rangs (calcul pondéré centralisé)
    const rankMap = {}
    for (const c of children) {
      const r = await getStudentResults(c.id)
      rankMap[c.id] = { average: r.generalAverage, rank: r.rank, classSize: r.classSize }
    }

    // 3. Derniers paiements (par enfant)
    const { rows: payments } = await query(
      `SELECT p.id, fi.student_id, p.amount, p.method, p.paid_at, fi.label
       FROM fee_payments p
       JOIN fee_invoices fi ON fi.id = p.invoice_id
       WHERE fi.student_id = ANY($1)
       ORDER BY p.paid_at DESC
       LIMIT 30`,
      [childIds]
    )
    const paymentsByChild = {}
    for (const p of payments) {
      (paymentsByChild[p.student_id] ||= []).push({
        id:     p.id,
        amount: parseFloat(p.amount),
        method: p.method,
        paidAt: p.paid_at,
        label:  p.label,
      })
    }

    res.json({
      children: children.map(c => {
        const due  = parseFloat(c.total_due)
        const paid = parseFloat(c.total_paid)
        const g = rankMap[c.id] || null
        return {
          id:              c.id,
          firstName:       c.first_name,
          lastName:        c.last_name,
          avatarUrl:       c.avatar_url,
          gender:          c.gender,
          relation:        c.relation,
          className:       c.class_name,
          attendanceToday: c.attendance_today, // 'present' | 'absent' | 'late' | 'excused' | null
          average:         g ? g.average : null,
          rank:            g ? g.rank : null,
          classSize:       g ? g.classSize : null,
          totalDue:        due,
          totalPaid:       paid,
          balance:         due - paid,
          payments:        paymentsByChild[c.id] || [],
        }
      }),
      messages: [], // module messagerie à venir
    })
  } catch (err) {
    next(err)
  }
})

export default router

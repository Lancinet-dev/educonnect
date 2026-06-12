import express from 'express'
import PDFDocument from 'pdfkit'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query, pool } from '../db/pool.js'
import { getStudentResults, getStudentClass } from '../services/grades.service.js'

const router = express.Router()

const VALID_TYPES = ['devoir', 'interrogation', 'composition']
const DEFAULT_COEF = { devoir: 1, interrogation: 1, composition: 2 }

// Un enseignant n'accède qu'à ses classes ; admin → son école
async function canAccessClass(user, classId) {
  const { rows } = await query('SELECT id, school_id FROM classes WHERE id = $1', [classId])
  const cls = rows[0]
  if (!cls) return null
  if (user.role === 'super_admin') return cls
  if (cls.school_id !== user.school_id) return null
  if (user.role === 'school_admin') return cls
  if (user.role === 'teacher') {
    const { rows: t } = await query(
      'SELECT 1 FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
      [classId, user.id]
    )
    return t[0] ? cls : null
  }
  return null
}

// Droit de consulter les résultats d'un élève (élève lui-même, son parent, staff)
async function canViewStudent(user, studentId) {
  if (user.role === 'super_admin') return true
  if (user.role === 'student') return user.id === studentId
  if (user.role === 'parent') {
    const { rows } = await query(
      'SELECT 1 FROM parent_students WHERE parent_id = $1 AND student_id = $2',
      [user.id, studentId]
    )
    return !!rows[0]
  }
  if (user.role === 'school_admin' || user.role === 'teacher') {
    const { rows } = await query('SELECT school_id FROM users WHERE id = $1', [studentId])
    return rows[0]?.school_id === user.school_id
  }
  return false
}

// ── GET /api/grades/subjects ──────────────────────────────────
// Matières de l'école (pour le sélecteur de saisie)
router.get('/subjects', authenticate, authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, short_name, coefficient
       FROM subjects WHERE school_id = $1 ORDER BY name`,
      [req.user.school_id]
    )
    res.json(rows.map(s => ({ id: s.id, name: s.name, shortName: s.short_name, coefficient: parseFloat(s.coefficient) })))
  } catch (err) { next(err) }
})

// ── GET /api/grades/students?classId= ─────────────────────────
// Élèves d'une classe (pour une nouvelle évaluation)
router.get('/students', authenticate, authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { classId } = req.query
    const cls = await canAccessClass(req.user, classId)
    if (!cls) return res.status(403).json({ error: 'Accès à cette classe refusé.' })

    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url
       FROM class_students cs JOIN users u ON u.id = cs.student_id
       WHERE cs.class_id = $1 ORDER BY u.last_name, u.first_name`,
      [classId]
    )
    res.json(rows.map(s => ({ id: s.id, firstName: s.first_name, lastName: s.last_name, avatarUrl: s.avatar_url })))
  } catch (err) { next(err) }
})

// ── GET /api/grades/evaluations ───────────────────────────────
// Historique des évaluations (filtres : classId, subjectId, term)
router.get('/evaluations', authenticate, authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { classId, subjectId, term } = req.query
    const conds = []
    const params = []

    if (req.user.role === 'teacher') {
      params.push(req.user.id)
      conds.push(`e.class_id IN (SELECT class_id FROM class_teachers WHERE teacher_id = $${params.length})`)
    } else {
      params.push(req.user.school_id)
      conds.push(`e.school_id = $${params.length}`)
    }
    if (classId)   { params.push(classId);   conds.push(`e.class_id = $${params.length}`) }
    if (subjectId) { params.push(subjectId); conds.push(`e.subject_id = $${params.length}`) }
    if (term)      { params.push(term);      conds.push(`e.term = $${params.length}`) }

    const { rows } = await query(
      `SELECT e.id, e.type, e.label, e.coefficient, e.term, e.date,
              c.id AS class_id, c.name AS class_name,
              s.id AS subject_id, s.name AS subject_name, s.short_name,
              (SELECT COUNT(*) FROM grades g WHERE g.evaluation_id = e.id) AS graded_count
       FROM evaluations e
       JOIN classes c  ON c.id = e.class_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE ${conds.join(' AND ')}
       ORDER BY e.date DESC, e.created_at DESC`,
      params
    )
    res.json(rows.map(e => ({
      id: e.id, type: e.type, label: e.label, coefficient: parseFloat(e.coefficient),
      term: e.term, date: e.date,
      classId: e.class_id, className: e.class_name,
      subjectId: e.subject_id, subjectName: e.subject_name, shortName: e.short_name,
      gradedCount: parseInt(e.graded_count),
    })))
  } catch (err) { next(err) }
})

// ── GET /api/grades/evaluation/:id ────────────────────────────
// Détail d'une évaluation + notes par élève (pour modification)
router.get('/evaluation/:id', authenticate, authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { rows: er } = await query(
      `SELECT e.*, c.name AS class_name, s.name AS subject_name
       FROM evaluations e
       JOIN classes c  ON c.id = e.class_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE e.id = $1`,
      [req.params.id]
    )
    const ev = er[0]
    if (!ev) return res.status(404).json({ error: 'Évaluation introuvable.' })

    const cls = await canAccessClass(req.user, ev.class_id)
    if (!cls) return res.status(403).json({ error: 'Accès refusé.' })

    const { rows: students } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, g.value
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN grades g ON g.student_id = u.id AND g.evaluation_id = $1
       WHERE cs.class_id = $2
       ORDER BY u.last_name, u.first_name`,
      [ev.id, ev.class_id]
    )

    res.json({
      evaluation: {
        id: ev.id, classId: ev.class_id, className: ev.class_name,
        subjectId: ev.subject_id, subjectName: ev.subject_name,
        type: ev.type, label: ev.label, coefficient: parseFloat(ev.coefficient),
        maxValue: parseFloat(ev.max_value), term: ev.term, date: ev.date,
      },
      students: students.map(s => ({
        id: s.id, firstName: s.first_name, lastName: s.last_name, avatarUrl: s.avatar_url,
        value: s.value != null ? parseFloat(s.value) : null,
      })),
    })
  } catch (err) { next(err) }
})

// ── POST /api/grades/evaluations ──────────────────────────────
// Créer/mettre à jour une évaluation + ses notes (en lot)
router.post('/evaluations', authenticate, authorize('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const {
      evaluationId, classId, subjectId,
      type = 'devoir', label, coefficient,
      term = '1er trimestre', date, maxValue = 20, notes = [],
    } = req.body

    const cls = await canAccessClass(req.user, classId)
    if (!cls) { client.release(); return res.status(403).json({ error: 'Accès à cette classe refusé.' }) }
    if (!VALID_TYPES.includes(type)) { client.release(); return res.status(400).json({ error: 'Type d\'évaluation invalide.' }) }
    if (!label || !subjectId) { client.release(); return res.status(400).json({ error: 'Matière et libellé requis.' }) }

    const coef = coefficient != null ? coefficient : (DEFAULT_COEF[type] || 1)
    const day = date || new Date().toISOString().slice(0, 10)

    // Valider les notes fournies
    for (const n of notes) {
      if (n.value === '' || n.value == null) continue
      const v = parseFloat(n.value)
      if (Number.isNaN(v) || v < 0 || v > maxValue) {
        client.release()
        return res.status(400).json({ error: `Note invalide pour un élève (0–${maxValue}).` })
      }
    }

    await client.query('BEGIN')

    let evId = evaluationId
    if (evId) {
      await client.query(
        `UPDATE evaluations
         SET type = $1, label = $2, coefficient = $3, term = $4, date = $5, subject_id = $6, max_value = $7
         WHERE id = $8`,
        [type, label, coef, term, day, subjectId, maxValue, evId]
      )
    } else {
      const { rows } = await client.query(
        `INSERT INTO evaluations (school_id, class_id, subject_id, teacher_id, academic_year_id, type, label, coefficient, max_value, term, date)
         VALUES ($1,$2,$3,$4,(SELECT id FROM academic_years WHERE school_id=$1 AND is_current LIMIT 1),$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [cls.school_id, classId, subjectId, req.user.id, type, label, coef, maxValue, term, day]
      )
      evId = rows[0].id
    }

    // Remplacer les notes existantes par les nouvelles (saisie complète)
    await client.query('DELETE FROM grades WHERE evaluation_id = $1', [evId])
    let saved = 0
    for (const n of notes) {
      if (n.value === '' || n.value == null) continue
      await client.query(
        `INSERT INTO grades (school_id, student_id, subject_id, class_id, academic_year_id, evaluation_id, term, evaluation_type, value, max_value, coefficient, graded_at)
         VALUES ($1,$2,$3,$4,(SELECT academic_year_id FROM evaluations WHERE id=$5),$5,$6,$7,$8,$9,$10,$11)`,
        [cls.school_id, n.studentId, subjectId, classId, evId, term, type, parseFloat(n.value), maxValue, coef, day]
      )
      saved++
    }

    await client.query('COMMIT')
    res.json({ evaluationId: evId, saved })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// ── GET /api/grades/me/results ────────────────────────────────
// Résultats de l'élève connecté
router.get('/me/results', authenticate, authorize('student', 'super_admin'), async (req, res, next) => {
  try {
    res.json(await getStudentResults(req.user.id))
  } catch (err) { next(err) }
})

// ── GET /api/grades/parent/results ────────────────────────────
// Résultats de chaque enfant du parent
router.get('/parent/results', authenticate, authorize('parent', 'super_admin'), async (req, res, next) => {
  try {
    const { rows: children } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url
       FROM parent_students ps JOIN users u ON u.id = ps.student_id
       WHERE ps.parent_id = $1 ORDER BY u.first_name`,
      [req.user.id]
    )
    const results = []
    for (const c of children) {
      const r = await getStudentResults(c.id)
      results.push({ id: c.id, firstName: c.first_name, lastName: c.last_name, avatarUrl: c.avatar_url, ...r })
    }
    res.json({ children: results })
  } catch (err) { next(err) }
})

// ── GET /api/grades/bulletin/:studentId ───────────────────────
// Génère le bulletin PDF d'un élève
router.get('/bulletin/:studentId', authenticate, async (req, res, next) => {
  try {
    const { studentId } = req.params
    if (!(await canViewStudent(req.user, studentId))) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }

    const { rows: ur } = await query(
      `SELECT u.first_name, u.last_name, s.name AS school_name
       FROM users u LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1`,
      [studentId]
    )
    const student = ur[0]
    if (!student) return res.status(404).json({ error: 'Élève introuvable.' })

    const results = await getStudentResults(studentId)

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition',
      `attachment; filename="bulletin-${student.first_name}-${student.last_name}.pdf"`)
    doc.pipe(res)

    const BRAND = '#6366f1'

    // En-tête
    doc.fontSize(20).fillColor(BRAND).text(student.school_name || 'EduConnect', { align: 'center' })
    doc.moveDown(0.2)
    doc.fontSize(13).fillColor('#111').text('Bulletin de notes', { align: 'center' })
    doc.fontSize(10).fillColor('#666').text(results.subjects[0]?.grades[0]?.term || '1er trimestre', { align: 'center' })
    doc.moveDown(1)

    // Infos élève
    doc.fontSize(11).fillColor('#111')
    doc.text(`Élève : ${student.first_name} ${student.last_name}`)
    doc.text(`Classe : ${results.className || '—'}`)
    doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`)
    doc.moveDown(1)

    if (!results.hasGrades) {
      doc.fontSize(12).fillColor('#666').text('Aucune note disponible pour cette période.', { align: 'center' })
      doc.end()
      return
    }

    // Tableau des matières
    const left = 50, wSubject = 200, wCoef = 70, wAvg = 90
    let y = doc.y
    doc.fontSize(10).fillColor('#fff')
    doc.rect(left, y, 495, 22).fill(BRAND)
    doc.fillColor('#fff')
    doc.text('Matière', left + 8, y + 6)
    doc.text('Coef.', left + wSubject + 8, y + 6)
    doc.text('Moyenne /20', left + wSubject + wCoef + 8, y + 6)
    y += 22

    doc.fillColor('#111')
    for (const s of results.subjects) {
      doc.rect(left, y, 495, 20).strokeColor('#e4e4e7').stroke()
      doc.fillColor('#111').fontSize(10)
      doc.text(s.subject, left + 8, y + 5)
      doc.text(String(s.coefficient), left + wSubject + 8, y + 5)
      doc.text(s.average != null ? s.average.toFixed(2) : '—', left + wSubject + wCoef + 8, y + 5)
      y += 20
    }

    doc.moveDown(2)
    doc.y = y + 16

    // Synthèse
    doc.fontSize(13).fillColor(BRAND)
    doc.text(`Moyenne générale : ${results.generalAverage != null ? results.generalAverage.toFixed(2) + ' / 20' : '—'}`, { align: 'right' })
    if (results.rank != null) {
      doc.fontSize(11).fillColor('#111')
      doc.text(`Rang : ${results.rank}${results.rank === 1 ? 'er' : 'e'} sur ${results.classSize}`, { align: 'right' })
    }

    doc.moveDown(3)
    doc.fontSize(8).fillColor('#999')
    doc.text('Document généré automatiquement par EduConnect.', { align: 'center' })

    doc.end()
  } catch (err) { next(err) }
})

export default router

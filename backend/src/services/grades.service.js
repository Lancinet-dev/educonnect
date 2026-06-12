import { query } from '../db/pool.js'

const round2 = (n) => Math.round(n * 100) / 100

// Classe actuelle d'un élève (la plus récente)
export async function getStudentClass(studentId) {
  const { rows } = await query(
    `SELECT cl.id, cl.name
     FROM class_students cs
     JOIN classes cl ON cl.id = cs.class_id
     WHERE cs.student_id = $1
     ORDER BY cs.joined_at DESC
     LIMIT 1`,
    [studentId]
  )
  return rows[0] || null
}

// Calcule les résultats de tous les élèves d'une classe :
//   - moyenne par matière (pondérée par le coefficient de l'évaluation)
//   - moyenne générale (pondérée par le coefficient de la matière)
//   - classement décroissant
// Retourne { byStudent: { [studentId]: {...} }, ranking: [{studentId, generalAverage}] }
export async function computeClassResults(classId) {
  const { rows: grades } = await query(
    `SELECT g.student_id, g.value,
            e.id   AS evaluation_id, e.label, e.type, e.date, e.term,
            e.coefficient AS eval_coef, e.max_value,
            s.id   AS subject_id, s.name AS subject_name, s.short_name, s.color,
            s.coefficient AS subject_coef
     FROM grades g
     JOIN evaluations e ON e.id = g.evaluation_id
     JOIN subjects s    ON s.id = e.subject_id
     WHERE e.class_id = $1
     ORDER BY s.name, e.date`,
    [classId]
  )

  // student_id -> subject_id -> { meta, num, den, grades[] }
  const acc = {}
  for (const g of grades) {
    const sid = g.student_id
    const subj = g.subject_id
    acc[sid] ??= {}
    acc[sid][subj] ??= {
      subjectId:   subj,
      subject:     g.subject_name,
      shortName:   g.short_name,
      color:       g.color,
      subjectCoef: parseFloat(g.subject_coef),
      num: 0, den: 0,
      grades: [],
    }
    const norm = (parseFloat(g.value) / parseFloat(g.max_value)) * 20
    const coef = parseFloat(g.eval_coef)
    acc[sid][subj].num += norm * coef
    acc[sid][subj].den += coef
    acc[sid][subj].grades.push({
      evaluationId: g.evaluation_id,
      label:        g.label,
      type:         g.type,
      date:         g.date,
      term:         g.term,
      value:        parseFloat(g.value),
      maxValue:     parseFloat(g.max_value),
      coefficient:  coef,
    })
  }

  const byStudent = {}
  for (const sid of Object.keys(acc)) {
    const subjects = Object.values(acc[sid]).map(s => ({
      subjectId:   s.subjectId,
      subject:     s.subject,
      shortName:   s.shortName,
      color:       s.color,
      coefficient: s.subjectCoef,
      average:     s.den > 0 ? round2(s.num / s.den) : null,
      grades:      s.grades,
    }))
    // Moyenne générale pondérée par le coefficient de la matière
    let gNum = 0, gDen = 0
    for (const s of subjects) {
      if (s.average != null) { gNum += s.average * s.coefficient; gDen += s.coefficient }
    }
    byStudent[sid] = {
      subjects,
      generalAverage: gDen > 0 ? round2(gNum / gDen) : null,
    }
  }

  const ranking = Object.entries(byStudent)
    .filter(([, r]) => r.generalAverage != null)
    .map(([studentId, r]) => ({ studentId, generalAverage: r.generalAverage }))
    .sort((a, b) => b.generalAverage - a.generalAverage)

  return { byStudent, ranking }
}

// Résultats complets d'un élève (moyenne, rang, détail par matière)
export async function getStudentResults(studentId) {
  const cls = await getStudentClass(studentId)
  if (!cls) {
    return { hasGrades: false, className: null, generalAverage: null, rank: null, classSize: null, subjects: [] }
  }

  const { byStudent, ranking } = await computeClassResults(cls.id)
  const me = byStudent[studentId]

  if (!me || me.subjects.length === 0) {
    return { hasGrades: false, className: cls.name, generalAverage: null, rank: null, classSize: null, subjects: [] }
  }

  const rankIdx = ranking.findIndex(r => r.studentId === studentId)
  return {
    hasGrades:      true,
    className:      cls.name,
    generalAverage: me.generalAverage,
    rank:           rankIdx >= 0 ? rankIdx + 1 : null,
    classSize:      ranking.length,
    subjects:       me.subjects,
  }
}

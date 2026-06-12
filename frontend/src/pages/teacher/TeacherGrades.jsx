import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, ArrowLeft, Save, Pencil, BookOpen, FileText
} from 'lucide-react'
import {
  useGradeSubjects, useClassStudents, useTeacherEvaluations,
  useEvaluationDetail, useSaveEvaluation,
} from '@/hooks/useGrades'
import { useAttendanceClasses } from '@/hooks/useAttendance'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

const TYPES = [
  { key: 'devoir',        label: 'Devoir',         coef: 1 },
  { key: 'interrogation', label: 'Interrogation',  coef: 1 },
  { key: 'composition',   label: 'Composition',    coef: 2 },
]
const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.key, t.label]))
const today = () => new Date().toISOString().slice(0, 10)

// ── Historique des évaluations ────────────────────────────────
function EvaluationsList({ onNew, onEdit }) {
  const { data: evals, isLoading } = useTeacherEvaluations()

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Notes</h1>
          <p className="text-surface-500 mt-1">Vos évaluations saisies</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={onNew}>Ajouter une note</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-60 items-center"><Spinner /></div>
      ) : evals?.length === 0 ? (
        <Card className="text-center py-12">
          <FileText size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">Aucune évaluation pour le moment</p>
          <p className="text-surface-400 text-sm mt-1">Cliquez sur « Ajouter une note » pour commencer.</p>
        </Card>
      ) : (
        <Card padding={false} className="divide-y divide-surface-100">
          {evals.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-4 hover:bg-surface-50">
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 truncate">{e.label}</p>
                <p className="text-xs text-surface-500">
                  {e.className} · {e.subjectName} · {new Date(e.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Badge variant={e.type === 'composition' ? 'primary' : 'default'}>{TYPE_LABEL[e.type] || e.type}</Badge>
              <span className="text-xs text-surface-500 w-20 text-right hidden sm:block">{e.gradedCount} note(s)</span>
              <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => onEdit(e.id)}>Modifier</Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── Formulaire de saisie (création ou modification) ───────────
function GradeEntry({ evaluationId, onBack }) {
  const isEdit = !!evaluationId
  const { data: classes } = useAttendanceClasses()
  const { data: subjects } = useGradeSubjects()
  const { data: detail, isLoading: detailLoading } = useEvaluationDetail(evaluationId)
  const save = useSaveEvaluation()

  const [classId, setClassId]   = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [type, setType]         = useState('devoir')
  const [label, setLabel]       = useState('')
  const [coefficient, setCoef]  = useState(1)
  const [date, setDate]         = useState(today())
  const [notes, setNotes]       = useState({})           // studentId -> value (string)
  const [students, setStudents] = useState(null)         // en mode édition : liste fournie par le détail

  // Élèves en mode création (chargés selon la classe choisie)
  const { data: rosterNew } = useClassStudents(isEdit ? null : classId)

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (isEdit && detail) {
      const e = detail.evaluation
      setClassId(e.classId)
      setSubjectId(e.subjectId)
      setType(e.type)
      setLabel(e.label)
      setCoef(e.coefficient)
      setDate((e.date || today()).slice(0, 10))
      setStudents(detail.students)
      setNotes(Object.fromEntries(detail.students.map(s => [s.id, s.value != null ? String(s.value) : ''])))
    }
  }, [isEdit, detail])

  // En création : initialiser les notes quand le roster arrive
  useEffect(() => {
    if (!isEdit && rosterNew) {
      setStudents(rosterNew)
      setNotes(prev => Object.fromEntries(rosterNew.map(s => [s.id, prev[s.id] ?? ''])))
    }
  }, [isEdit, rosterNew])

  const onType = (t) => {
    setType(t)
    const def = TYPES.find(x => x.key === t)
    if (def) setCoef(def.coef)
  }

  const handleSave = async () => {
    if (!classId || !subjectId || !label.trim()) {
      toast.error('Renseignez la classe, la matière et le libellé.')
      return
    }
    const records = Object.entries(notes)
      .filter(([, v]) => v !== '' && v != null)
      .map(([studentId, value]) => ({ studentId, value: parseFloat(value) }))

    if (records.some(r => Number.isNaN(r.value) || r.value < 0 || r.value > 20)) {
      toast.error('Les notes doivent être comprises entre 0 et 20.')
      return
    }

    try {
      const res = await save.mutateAsync({
        evaluationId, classId, subjectId, type, label: label.trim(),
        coefficient, term: '1er trimestre', date, maxValue: 20, notes: records,
      })
      toast.success(`Notes enregistrées pour ${res.saved} élève${res.saved > 1 ? 's' : ''}`)
      onBack()
    } catch {
      toast.error("Échec de l'enregistrement.")
    }
  }

  if (isEdit && detailLoading) {
    return <div className="flex justify-center h-60 items-center"><Spinner /></div>
  }

  const counts = Object.values(notes).filter(v => v !== '' && v != null).length

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>Retour</Button>
        <h1 className="text-xl font-bold font-display text-surface-900">
          {isEdit ? 'Modifier une évaluation' : 'Ajouter une note'}
        </h1>
      </div>

      {/* Paramètres de l'évaluation */}
      <Card className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Classe</label>
            <select value={classId} disabled={isEdit} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white disabled:bg-surface-50
                         focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Choisir —</option>
              {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Matière</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Choisir —</option>
              {subjects?.map(s => <option key={s.id} value={s.id}>{s.name} (coef {s.coefficient})</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Type</label>
            <div className="flex gap-1.5">
              {TYPES.map(t => (
                <button key={t.key} onClick={() => onType(t.key)}
                  className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                  }`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Coefficient</label>
            <input type="number" min="0.5" step="0.5" value={coefficient}
              onChange={e => setCoef(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Date</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-surface-700 block mb-1.5">Libellé</label>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="ex : Devoir n°1 — Chapitre 3"
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </Card>

      {/* Liste des élèves + champs de note */}
      {!classId ? (
        <Card className="text-center py-10 text-surface-500 text-sm">Choisissez une classe pour saisir les notes.</Card>
      ) : !students ? (
        <div className="flex justify-center h-40 items-center"><Spinner /></div>
      ) : (
        <Card padding={false} className="divide-y divide-surface-100">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 sm:p-4">
              <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="md" />
              <p className="flex-1 font-medium text-surface-900 text-sm">{s.firstName} {s.lastName}</p>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" max="20" step="0.25"
                  value={notes[s.id] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder="—"
                  className="w-20 px-2 py-1.5 border border-surface-200 rounded-lg text-sm text-center
                             focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <span className="text-sm text-surface-400">/ 20</span>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-center text-surface-500 text-sm py-8">Aucun élève dans cette classe.</p>
          )}
        </Card>
      )}

      {/* Barre d'enregistrement */}
      {students && students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-surface-200 p-4 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-surface-500 hidden sm:block">{counts} note(s) saisie(s)</p>
            <Button variant="success" size="lg" icon={<Save size={18} />}
              loading={save.isPending} onClick={handleSave} className="flex-1 sm:flex-none">
              Enregistrer les notes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherGrades() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const evaluationId = params.get('evaluationId')
  const isNew = params.get('new') === '1'

  if (isNew) return <GradeEntry evaluationId={null} onBack={() => navigate('/teacher/notes')} />
  if (evaluationId) return <GradeEntry evaluationId={evaluationId} onBack={() => navigate('/teacher/notes')} />
  return (
    <EvaluationsList
      onNew={() => setParams({ new: '1' })}
      onEdit={(id) => setParams({ evaluationId: id })}
    />
  )
}

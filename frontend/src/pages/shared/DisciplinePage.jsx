import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, ShieldAlert, Clock, AlertTriangle, Shirt, UserX, HelpCircle } from 'lucide-react'
import { useDirectorIncidents, useCreateIncident } from '@/hooks/useIncidents'
import { useAttendanceClasses, useClassRoster } from '@/hooks/useAttendance'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const TYPES = [
  { key: 'retard', label: 'Retard', icon: Clock, variant: 'warning' },
  { key: 'comportement', label: 'Comportement', icon: AlertTriangle, variant: 'danger' },
  { key: 'tenue', label: 'Tenue', icon: Shirt, variant: 'info' },
  { key: 'absence', label: 'Absence', icon: UserX, variant: 'default' },
  { key: 'autre', label: 'Autre', icon: HelpCircle, variant: 'default' },
]
const TYPE_META = Object.fromEntries(TYPES.map(t => [t.key, t]))
const today = () => new Date().toISOString().slice(0, 10)

function IncidentModal({ onClose }) {
  const create = useCreateIncident()
  const { data: classes } = useAttendanceClasses()
  const [classId, setClassId] = useState('')
  const { data: roster } = useClassRoster(classId, today())
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState('comportement')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today())

  const submit = async () => {
    if (!classId || !studentId) { toast.error('Choisissez la classe et l\'élève.'); return }
    try {
      await create.mutateAsync({ studentId, classId, type, description, date })
      toast.success('Incident enregistré')
      onClose()
    } catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Signaler un incident</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={classId} onChange={e => { setClassId(e.target.value); setStudentId('') }}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Classe —</option>
              {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white disabled:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Élève —</option>
              {roster?.students?.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-600 border-surface-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Description de l'incident…"
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Date</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending} onClick={submit}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}

export default function DisciplinePage() {
  const [classId, setClassId] = useState('')
  const { data: incidents, isLoading } = useDirectorIncidents(classId)
  const { data: classes } = useAttendanceClasses()
  const [modal, setModal] = useState(false)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Discipline</h1>
          <p className="text-surface-500 mt-1">Incidents et suivi disciplinaire</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setModal(true)}>Signaler un incident</Button>
      </div>

      <select value={classId} onChange={e => setClassId(e.target.value)}
        className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        <option value="">Toutes les classes</option>
        {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : incidents?.length === 0 ? (
        <Card className="text-center py-12">
          <ShieldAlert size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">Aucun incident enregistré</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-surface-50">
            {incidents.map(i => {
              const m = TYPE_META[i.type] || TYPE_META.autre
              const Icon = m.icon
              return (
                <div key={i.id} className="flex items-start gap-3 p-4">
                  <Avatar firstName={i.studentName?.split(' ')[0]} lastName={i.studentName?.split(' ').slice(1).join(' ')} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-surface-900">{i.studentName}</p>
                      <Badge variant={m.variant}><Icon size={12} /> {i.typeLabel}</Badge>
                      {i.className && <span className="text-xs text-surface-400">{i.className}</span>}
                    </div>
                    {i.description && <p className="text-sm text-surface-600 mt-1">{i.description}</p>}
                    <p className="text-xs text-surface-400 mt-1">
                      {new Date(i.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {i.reportedBy ? ` · signalé par ${i.reportedBy}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {modal && <IncidentModal onClose={() => setModal(false)} />}
    </div>
  )
}

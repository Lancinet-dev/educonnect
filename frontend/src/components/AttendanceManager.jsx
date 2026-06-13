import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CheckCircle2, XCircle, Clock, ArrowLeft, Save, BookOpen, Users
} from 'lucide-react'
import {
  useAttendanceClasses, useClassRoster, useSaveAttendance
} from '@/hooks/useAttendance'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const STATUS = [
  { key: 'present', label: 'Présent', icon: CheckCircle2, active: 'bg-emerald-600 text-white border-emerald-600', idle: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
  { key: 'absent',  label: 'Absent',  icon: XCircle,      active: 'bg-red-600 text-white border-red-600',         idle: 'text-red-700 border-red-200 hover:bg-red-50' },
  { key: 'late',    label: 'Retard',  icon: Clock,        active: 'bg-amber-500 text-white border-amber-500',     idle: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
]

const today = () => new Date().toISOString().slice(0, 10)

function ClassPicker({ onPick }) {
  const { data: classes, isLoading } = useAttendanceClasses()
  if (isLoading) return <div className="flex justify-center h-60 items-center"><Spinner /></div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Faire l'appel</h1>
        <p className="text-surface-500 mt-1">Choisissez une classe</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes?.map((c) => (
          <button key={c.id} onClick={() => onPick(c.id)}
            className="text-left p-5 bg-white rounded-xl border border-surface-200 shadow-sm
                       hover:border-brand-300 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
                <BookOpen size={22} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-surface-900">{c.name}</p>
                <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                  <Users size={12} /> {c.students} élève{c.students > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
        {classes?.length === 0 && (
          <p className="text-surface-500 text-sm">Aucune classe disponible.</p>
        )}
      </div>
    </div>
  )
}

function CallSheet({ classId, onBack }) {
  const [date, setDate] = useState(today())
  const { data, isLoading, error } = useClassRoster(classId, date)
  const save = useSaveAttendance()
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    if (data?.students) {
      setStatuses(Object.fromEntries(data.students.map(s => [s.id, s.status])))
    }
  }, [data])

  if (isLoading) return <div className="flex justify-center h-60 items-center"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur de chargement.</p></Card>

  const setStatus = (id, status) => setStatuses(prev => ({ ...prev, [id]: status }))
  const counts = Object.values(statuses).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})

  const handleSave = async () => {
    const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }))
    try {
      const res = await save.mutateAsync({ classId, date, records })
      toast.success(`Appel enregistré pour ${res.saved} élève${res.saved > 1 ? 's' : ''}`)
    } catch {
      toast.error("Échec de l'enregistrement de l'appel.")
    }
  }

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>Retour</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-display text-surface-900">Appel · {data.class.name}</h1>
          {data.alreadyRecorded && (
            <p className="text-xs text-emerald-600 mt-0.5">Appel déjà enregistré — vous pouvez le modifier</p>
          )}
        </div>
        <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div className="flex gap-2 text-sm">
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{counts.present || 0} présents</span>
        <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-medium">{counts.absent || 0} absents</span>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{counts.late || 0} retards</span>
      </div>

      <Card padding={false} className="divide-y divide-surface-100">
        {data.students.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 sm:p-4">
            <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="md" />
            <p className="flex-1 font-medium text-surface-900 text-sm sm:text-base">{s.firstName} {s.lastName}</p>
            <div className="flex gap-1.5">
              {STATUS.map(({ key, label, icon: Icon, active, idle }) => {
                const isActive = statuses[s.id] === key
                return (
                  <button key={key} onClick={() => setStatus(s.id, key)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium
                                transition-all ${isActive ? active : `bg-white ${idle}`}`}>
                    <Icon size={15} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {data.students.length === 0 && (
          <p className="text-center text-surface-500 text-sm py-8">Aucun élève dans cette classe.</p>
        )}
      </Card>

      {data.students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-surface-200 p-4 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-surface-500 hidden sm:block">{Object.keys(statuses).length} élève(s) · {date}</p>
            <Button variant="success" size="lg" icon={<Save size={18} />}
              loading={save.isPending} onClick={handleSave} className="flex-1 sm:flex-none">
              Enregistrer l'appel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Gestionnaire d'appel réutilisable (enseignant, surveillant).
// `basePath` = route de la page (ex. '/teacher/presences') pour le retour.
export default function AttendanceManager({ basePath }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const classId = params.get('classId')

  if (!classId) return <ClassPicker onPick={(id) => setParams({ classId: id })} />
  return <CallSheet classId={classId} onBack={() => navigate(basePath)} />
}

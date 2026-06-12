import { useState } from 'react'
import { CheckCircle2, GraduationCap } from 'lucide-react'
import { useParentAttendance } from '@/hooks/useAttendance'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

// Couleur d'une case selon le statut
const DAY_STYLE = {
  present: 'bg-emerald-500 text-white',
  absent:  'bg-red-500 text-white',
  late:    'bg-amber-500 text-white',
  excused: 'bg-blue-500 text-white',
}
const STATUS_LABEL = { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Excusé' }

// Génère les 30 derniers jours (du plus ancien au plus récent)
function last30Days() {
  const out = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d)
  }
  return out
}

function ChildCalendar({ child }) {
  const byDate = Object.fromEntries(child.days.map(d => [d.date, d.status]))
  const days = last30Days()

  return (
    <div className="space-y-5">
      {/* Taux annuel */}
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col items-center justify-center text-center min-w-[140px]">
          <CheckCircle2 size={32} className="text-emerald-600" />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-2">Taux de présence</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">
            {child.presenceRate != null ? `${child.presenceRate}%` : '—'}
          </p>
          <p className="text-[11px] text-surface-500">cette année</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-surface-600">
            Voici l'assiduité de <span className="font-semibold text-surface-900">{child.firstName}</span> sur les 30 derniers jours.
            Chaque case représente un jour.
          </p>
          {/* Légende */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Présent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Retard</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface-200" /> Pas d'école</span>
          </div>
        </div>
      </div>

      {/* Calendrier 30 jours */}
      <div className="grid grid-cols-7 gap-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-surface-400">{d}</div>
        ))}
        {/* Décalage pour aligner le 1er jour sur le bon jour de semaine (ISO : lundi=1) */}
        {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((d) => {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const status = byDate[iso]
          const style = status ? DAY_STYLE[status] : 'bg-surface-100 text-surface-400'
          return (
            <div key={iso}
              title={status ? `${d.toLocaleDateString('fr-FR')} — ${STATUS_LABEL[status]}` : d.toLocaleDateString('fr-FR')}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium ${style}`}>
              {d.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ParentAttendance() {
  const { data, isLoading, error } = useParentAttendance()
  const [activeIdx, setActiveIdx] = useState(0)

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  const children = data?.children || []
  if (children.length === 0) {
    return (
      <Card className="text-center py-12">
        <GraduationCap size={40} className="text-surface-300 mx-auto mb-3" />
        <p className="text-surface-600 font-medium">Aucun enfant rattaché à votre compte</p>
      </Card>
    )
  }

  const child = children[Math.min(activeIdx, children.length - 1)]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Présences</h1>
        <p className="text-surface-500 mt-1">Suivi de l'assiduité de vos enfants</p>
      </div>

      {/* Sélecteur d'enfants */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => (
            <button key={c.id} onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl border transition-all ${
                i === activeIdx ? 'bg-brand-50 border-brand-300 shadow-sm' : 'bg-white border-surface-200 hover:border-surface-300'
              }`}>
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="sm" />
              <div className="text-left">
                <p className={`text-sm font-semibold leading-tight ${i === activeIdx ? 'text-brand-700' : 'text-surface-800'}`}>
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-[11px] text-surface-500">{c.className || 'Classe non définie'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Card>
        <ChildCalendar child={child} />
      </Card>
    </div>
  )
}

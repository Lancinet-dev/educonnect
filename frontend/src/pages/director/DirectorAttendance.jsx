import { useState, useEffect } from 'react'
import {
  CheckCircle2, XCircle, Clock, HelpCircle, TrendingUp, CalendarDays
} from 'lucide-react'
import {
  useAttendanceClasses, useClassRoster, useDirectorAttendanceStats
} from '@/hooks/useAttendance'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const today = () => new Date().toISOString().slice(0, 10)

const STATUS_BADGE = {
  present: { label: 'Présent', variant: 'success', icon: CheckCircle2 },
  absent:  { label: 'Absent',  variant: 'danger',  icon: XCircle },
  late:    { label: 'Retard',  variant: 'warning', icon: Clock },
  excused: { label: 'Excusé',  variant: 'info',    icon: HelpCircle },
}

export default function DirectorAttendance() {
  const { data: classes } = useAttendanceClasses()
  const { data: stats, isLoading: statsLoading } = useDirectorAttendanceStats()
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(today())

  // Sélectionner la première classe par défaut
  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id)
  }, [classes, classId])

  const { data: roster, isLoading: rosterLoading } = useClassRoster(classId, date)

  // N'afficher un statut que si l'appel a réellement été fait ce jour-là
  const recorded = roster?.alreadyRecorded

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Présences</h1>
        <p className="text-surface-500 mt-1">Suivi de l'assiduité des élèves</p>
      </div>

      {/* Statistiques globales */}
      {statsLoading ? (
        <div className="flex justify-center h-32 items-center"><Spinner /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Présence ce mois"  value={stats.month.presenceRate != null ? `${stats.month.presenceRate}%` : '—'} icon={TrendingUp}  color="green" />
            <StatCard label="Présence (7 jours)" value={stats.weekPresenceRate != null ? `${stats.weekPresenceRate}%` : '—'}   icon={CalendarDays} color="brand" />
            <StatCard label="Absences ce mois"  value={stats.month.absent} icon={XCircle} color="red" />
            <StatCard label="Retards ce mois"   value={stats.month.late}   icon={Clock}   color="amber" />
          </div>

          {/* Classement par absentéisme */}
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Classement par absentéisme (ce mois)</h3>
            {stats.ranking.every(r => r.total === 0) ? (
              <p className="text-sm text-surface-500 text-center py-4">Pas encore de données ce mois.</p>
            ) : (
              <div className="space-y-2">
                {stats.ranking.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50">
                    <span className="w-6 text-center text-sm font-semibold text-surface-400">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-surface-900">{r.name}</span>
                    <span className="text-xs text-surface-500">{r.absent} abs · {r.late} ret.</span>
                    <div className="w-28 h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div className={`h-full ${r.absenceRate > 25 ? 'bg-red-500' : r.absenceRate > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                           style={{ width: `${r.absenceRate ?? 0}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-surface-900">
                      {r.absenceRate != null ? `${r.absenceRate}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Consultation par classe & date */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Classe</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand-500">
              {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Date</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        {rosterLoading ? (
          <div className="flex justify-center h-40 items-center"><Spinner /></div>
        ) : !recorded ? (
          <div className="text-center py-10">
            <CalendarDays size={28} className="text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">
              Aucun appel enregistré pour cette classe le {new Date(date).toLocaleDateString('fr-FR')}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {roster.students.map((s) => {
              const b = STATUS_BADGE[s.status] || STATUS_BADGE.present
              const Icon = b.icon
              return (
                <div key={s.id} className="flex items-center gap-3 py-2.5">
                  <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="sm" />
                  <span className="flex-1 text-sm font-medium text-surface-900">{s.firstName} {s.lastName}</span>
                  <Badge variant={b.variant}>
                    <Icon size={13} /> {b.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

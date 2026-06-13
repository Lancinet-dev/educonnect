import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, ShieldAlert, TrendingUp, CalendarDays, XCircle, Clock,
} from 'lucide-react'
import { useDirectorAttendanceStats } from '@/hooks/useAttendance'
import { useDirectorIncidents } from '@/hooks/useIncidents'
import { useAuth } from '@/hooks/useAuth'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import AttendanceManager from '@/components/AttendanceManager'
import DisciplinePage from '@/pages/shared/DisciplinePage'
import MessagesPage from '@/pages/communication/MessagesPage'

function Overview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: stats, isLoading } = useDirectorAttendanceStats()
  const { data: incidents } = useDirectorIncidents()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Bonjour, {user?.first_name} 👋</h1>
          <p className="text-surface-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="lg" icon={<ShieldAlert size={18} />} onClick={() => navigate('/surveillant/discipline')}>Discipline</Button>
          <Button size="lg" icon={<ClipboardCheck size={18} />} onClick={() => navigate('/surveillant/presences')}>Faire l'appel</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-40 items-center"><Spinner /></div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Présence ce mois" value={stats.month.presenceRate != null ? `${stats.month.presenceRate}%` : '—'} icon={TrendingUp} color="green" />
          <StatCard label="Présence (7 jours)" value={stats.weekPresenceRate != null ? `${stats.weekPresenceRate}%` : '—'} icon={CalendarDays} color="brand" />
          <StatCard label="Absences ce mois" value={stats.month.absent} icon={XCircle} color="red" />
          <StatCard label="Retards ce mois" value={stats.month.late} icon={Clock} color="amber" />
        </div>
      )}

      {/* Classement absentéisme + incidents récents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-surface-900 mb-3">Classes à surveiller (absentéisme)</h3>
          {!stats || stats.ranking.every(r => r.total === 0) ? (
            <p className="text-sm text-surface-500 text-center py-4">Pas encore de données ce mois.</p>
          ) : (
            <div className="space-y-2">
              {stats.ranking.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50">
                  <span className="w-6 text-center text-sm font-semibold text-surface-400">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-surface-900">{r.name}</span>
                  <span className="text-xs text-surface-500">{r.absent} abs · {r.late} ret.</span>
                  <span className="w-12 text-right text-sm font-semibold text-surface-900">{r.absenceRate != null ? `${r.absenceRate}%` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-900">Incidents récents</h3>
            <button onClick={() => navigate('/surveillant/discipline')} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Tout voir</button>
          </div>
          {!incidents || incidents.length === 0 ? (
            <div className="text-center py-6">
              <ShieldAlert size={28} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Aucun incident</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.slice(0, 5).map(i => (
                <div key={i.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-50">
                  <Avatar firstName={i.studentName?.split(' ')[0]} lastName={i.studentName?.split(' ').slice(1).join(' ')} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">{i.studentName}</p>
                    <p className="text-xs text-surface-500">{i.className || ''} · {new Date(i.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Badge variant="default">{i.typeLabel}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function SurveillantDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="presences" element={<AttendanceManager basePath="/surveillant/presences" />} />
      <Route path="discipline" element={<DisciplinePage />} />
      <Route path="messages" element={<MessagesPage />} />
    </Routes>
  )
}

import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Clock, HelpCircle,
  BookOpen, ClipboardList, Calendar, Wallet, Download
} from 'lucide-react'
import { useStudentOverview } from '@/hooks/useStudentData'
import { useAuth } from '@/hooks/useAuth'
import { downloadBulletin } from '@/hooks/useGrades'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'
import StudentGrades from './StudentGrades'

const ATTENDANCE = {
  present: { label: 'Présent(e)',      icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'border-emerald-200' },
  absent:  { label: 'Absent(e)',       icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',     ring: 'border-red-200' },
  late:    { label: 'En retard',       icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'border-amber-200' },
  excused: { label: 'Absence excusée', icon: HelpCircle,   bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'border-blue-200' },
}
const ATTENDANCE_NONE = { label: 'Non renseignée', icon: HelpCircle, bg: 'bg-surface-50', text: 'text-surface-500', ring: 'border-surface-200' }

function Overview() {
  const { data, isLoading, error } = useStudentOverview()
  const { user, fullName } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>
  }
  if (error) {
    return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement des données.</p></Card>
  }

  const { student, attendanceToday, grades, average, rank, classSize, timetable, homework, fees } = data
  const a = ATTENDANCE[attendanceToday] || ATTENDANCE_NONE
  const AIcon = a.icon

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête : identité de l'élève */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar firstName={student.firstName} lastName={student.lastName} src={student.avatarUrl} size="2xl" />
          <div>
            <h1 className="text-2xl font-bold font-display text-surface-900">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-surface-500">
              {student.className || 'Classe non définie'} · {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </Card>

      {/* Présence du jour + moyenne + solde */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Présence */}
        <div className={`rounded-2xl border ${a.ring} ${a.bg} p-6 flex flex-col items-center justify-center text-center`}>
          <AIcon size={40} className={a.text} />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Ma présence aujourd'hui</p>
          <p className={`text-xl font-bold mt-0.5 ${a.text}`}>{a.label}</p>
        </div>

        {/* Moyenne + rang */}
        <div className="rounded-2xl border border-surface-200 bg-white p-6 flex flex-col items-center justify-center text-center">
          <BookOpen size={40} className="text-violet-500" />
          {average != null ? (
            <>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Ma moyenne</p>
              <p className="text-2xl font-bold text-surface-900 mt-0.5">{average}/20</p>
              {rank != null && (
                <p className="text-sm text-surface-500 mt-1">
                  {rank}<sup>{rank === 1 ? 'er' : 'e'}</sup> sur {classSize}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Mes notes</p>
              <p className="text-base font-semibold text-surface-500 mt-1">Pas encore disponibles</p>
            </>
          )}
        </div>

        {/* Solde scolarité */}
        <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${
          fees.balance <= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <Wallet size={40} className={fees.balance <= 0 ? 'text-emerald-600' : 'text-amber-600'} />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Scolarité</p>
          {fees.balance <= 0 ? (
            <p className="text-xl font-bold text-emerald-700 mt-0.5">À jour ✓</p>
          ) : (
            <p className="text-xl font-bold text-amber-700 mt-0.5">{formatGNF(fees.balance)}</p>
          )}
        </div>
      </div>

      {/* Emploi du temps du jour + Devoirs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Emploi du temps du jour */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Mon emploi du temps — aujourd'hui</h3>
            <Calendar size={16} className="text-surface-400" />
          </div>
          {timetable.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Emploi du temps non disponible</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timetable.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                  <span className="w-1.5 h-10 rounded-full shrink-0" style={{ background: slot.color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{slot.subject || 'Cours'}</p>
                    <p className="text-xs text-surface-500">
                      {slot.teacher ? `${slot.teacher}` : 'Enseignant à définir'}{slot.room ? ` · ${slot.room}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-surface-700 shrink-0">
                    {slot.startTime}–{slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Devoirs */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Mes devoirs</h3>
            <ClipboardList size={16} className="text-surface-400" />
          </div>
          {homework.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={28} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Aucun devoir pour le moment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map((h) => (
                <div key={h.id} className="p-3 rounded-lg bg-surface-50">
                  <p className="text-sm font-medium text-surface-900">{h.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{h.subject}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dernières notes */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-semibold text-surface-900">Mes dernières notes</h3>
          {average != null && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/notes')}>Voir tout</Button>
              <Button variant="secondary" size="sm" icon={<Download size={15} />}
                onClick={() => downloadBulletin(student.id, fullName)}>Bulletin</Button>
            </div>
          )}
        </div>
        {grades.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen size={28} className="text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">Pas encore de notes disponibles</p>
          </div>
        ) : (
          <div className="space-y-2">
            {grades.map((g, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: g.color || '#6366f1' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-surface-900">{g.subject || 'Matière'}</p>
                  <p className="text-xs text-surface-500">{g.term || ''}</p>
                </div>
                <span className="text-sm font-bold text-surface-900">{g.value}/{g.maxValue}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="notes" element={<StudentGrades />} />
    </Routes>
  )
}

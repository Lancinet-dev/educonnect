import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, CheckCircle2, AlertTriangle,
  Calendar, GraduationCap, Clock, ClipboardCheck, PlusCircle, MessageSquare, ClipboardList
} from 'lucide-react'
import { useTeacherOverview } from '@/hooks/useTeacherData'
import { useAuth } from '@/hooks/useAuth'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { formatPercent } from '@/utils/format'
import TeacherAttendance from './TeacherAttendance'
import TeacherGrades from './TeacherGrades'
import TeacherHomework from './TeacherHomework'
import TeacherClasses from './TeacherClasses'
import MessagesPage from '@/pages/communication/MessagesPage'
import AnnouncementsPage from '@/pages/communication/AnnouncementsPage'

function Overview() {
  const { data, isLoading, error } = useTeacherOverview()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return <DashboardSkeleton />
  }
  if (error) {
    return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement des données.</p></Card>
  }

  const { counts, attendanceToday, classes, timetable } = data
  const absentLate = attendanceToday.absent + attendanceToday.late

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">
            Bonjour, {user?.first_name} 👋
          </h1>
          <p className="text-surface-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="lg" icon={<MessageSquare size={18} />} onClick={() => navigate('/teacher/messages')}>
            Envoyer un message
          </Button>
          <Button variant="secondary" size="lg" icon={<PlusCircle size={18} />} onClick={() => navigate('/teacher/notes?new=1')}>
            Ajouter une note
          </Button>
          <Button variant="secondary" size="lg" icon={<ClipboardList size={18} />} onClick={() => navigate('/teacher/devoirs?new=1')}>
            Donner un devoir
          </Button>
          <Button size="lg" icon={<ClipboardCheck size={18} />} onClick={() => navigate('/teacher/presences')}>
            Faire l'appel
          </Button>
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mes classes"  value={counts.classes}          icon={BookOpen}      color="brand" />
        <StatCard label="Mes élèves"   value={counts.students}         icon={GraduationCap} color="blue" />
        <StatCard label="Présents"     value={attendanceToday.present} icon={CheckCircle2}  color="green" />
        <StatCard label="Absents / retards" value={absentLate}         icon={AlertTriangle} color="amber" />
      </div>

      {/* Présences du jour + Emploi du temps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Présences du jour */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Présences — aujourd'hui</h3>
            <Clock size={16} className="text-surface-400" />
          </div>
          {attendanceToday.total === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">
              Aucune présence saisie aujourd'hui
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Présents
                </span>
                <span className="text-sm font-semibold text-surface-900">
                  {attendanceToday.present} ({formatPercent(attendanceToday.present, attendanceToday.total)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Absents
                </span>
                <span className="text-sm font-semibold text-surface-900">{attendanceToday.absent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Retards
                </span>
                <span className="text-sm font-semibold text-surface-900">{attendanceToday.late}</span>
              </div>
              <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mt-2 flex">
                <div className="bg-emerald-500 h-full" style={{ width: formatPercent(attendanceToday.present, attendanceToday.total) }} />
                <div className="bg-amber-500 h-full"   style={{ width: formatPercent(attendanceToday.late, attendanceToday.total) }} />
                <div className="bg-red-500 h-full"     style={{ width: formatPercent(attendanceToday.absent, attendanceToday.total) }} />
              </div>
            </div>
          )}
        </Card>

        {/* Emploi du temps du jour */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Mon emploi du temps — aujourd'hui</h3>
            <Calendar size={16} className="text-surface-400" />
          </div>
          {timetable.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Aucun cours prévu aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timetable.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                  <span className="w-1.5 h-10 rounded-full shrink-0" style={{ background: slot.color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{slot.subject || 'Cours'}</p>
                    <p className="text-xs text-surface-500">
                      {slot.className}{slot.room ? ` · ${slot.room}` : ''}
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
      </div>

      {/* Mes classes */}
      <div>
        <h3 className="font-semibold text-surface-900 mb-3">Mes classes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <BookOpen size={22} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900 leading-tight">{c.name}</p>
                    <p className="text-xs text-surface-500">{c.level || ''}{c.room ? ` · ${c.room}` : ''}</p>
                  </div>
                </div>
                {c.isMain && <Badge variant="primary">Principal</Badge>}
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-100">
                <span className="text-sm text-surface-600 flex items-center gap-2">
                  <Users size={16} className="text-surface-400" />
                  <span className="font-semibold text-surface-900">{c.students}</span> élève{c.students > 1 ? 's' : ''}
                </span>
                <Button variant="secondary" size="sm" icon={<ClipboardCheck size={15} />}
                  onClick={() => navigate(`/teacher/presences?classId=${c.id}`)}>
                  Appel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="classes" element={<TeacherClasses />} />
      <Route path="presences" element={<TeacherAttendance />} />
      <Route path="notes" element={<TeacherGrades />} />
      <Route path="devoirs" element={<TeacherHomework />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="annonces" element={<AnnouncementsPage />} />
    </Routes>
  )
}

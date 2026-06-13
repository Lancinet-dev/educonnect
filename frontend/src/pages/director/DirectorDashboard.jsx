import { Routes, Route } from 'react-router-dom'
import {
  Users, GraduationCap, BookOpen, UserCheck,
  AlertTriangle, TrendingUp, Wallet, Clock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, LineChart, Line
} from 'recharts'
import { useDirectorOverview } from '@/hooks/useDirectorData'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatGNF, formatPercent } from '@/utils/format'
import { useAuth } from '@/hooks/useAuth'
import DirectorAttendance from './DirectorAttendance'
import MessagesPage from '@/pages/communication/MessagesPage'
import AnnouncementsPage from '@/pages/communication/AnnouncementsPage'

// ── Page principale : vue d'ensemble ──────────────────────────
function Overview() {
  const { data, isLoading, error } = useDirectorOverview()
  const { user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des données.</p>
      </Card>
    )
  }

  const { counts, attendance, finances, absentStudents, classDistribution, revenueHistory } = data

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          Tableau de bord
        </h1>
        <p className="text-surface-500 mt-1">
          {user?.school_name} · {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Élèves"
          value={counts.students}
          icon={GraduationCap}
          color="brand"
        />
        <StatCard
          label="Enseignants"
          value={counts.teachers}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Classes"
          value={counts.classes}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          label="Parents inscrits"
          value={counts.parents}
          icon={UserCheck}
          color="green"
        />
      </div>

      {/* Présences + Finances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Présences élèves */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Présences élèves — aujourd'hui</h3>
            <Clock size={16} className="text-surface-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Présents
              </span>
              <span className="text-sm font-semibold text-surface-900">
                {attendance.students.present} ({formatPercent(attendance.students.present, attendance.students.total)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Absents
              </span>
              <span className="text-sm font-semibold text-surface-900">
                {attendance.students.absent}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Retards
              </span>
              <span className="text-sm font-semibold text-surface-900">
                {attendance.students.late}
              </span>
            </div>
            {/* Barre de progression */}
            <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mt-2 flex">
              <div className="bg-emerald-500 h-full" style={{
                width: formatPercent(attendance.students.present, attendance.students.total)
              }} />
              <div className="bg-amber-500 h-full" style={{
                width: formatPercent(attendance.students.late, attendance.students.total)
              }} />
              <div className="bg-red-500 h-full" style={{
                width: formatPercent(attendance.students.absent, attendance.students.total)
              }} />
            </div>
          </div>
        </Card>

        {/* Recettes du mois */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Recettes ce mois</h3>
            <Wallet size={16} className="text-surface-400" />
          </div>
          <p className="text-3xl font-bold font-display text-surface-900">
            {formatGNF(finances.revenueThisMonth)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-600">
            <TrendingUp size={14} />
            <span>Paiements encaissés</span>
          </div>
        </Card>

        {/* Impayés */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Impayés</h3>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-bold font-display text-red-600">
            {formatGNF(finances.totalUnpaid)}
          </p>
          <p className="text-sm text-surface-500 mt-2">
            {finances.invoicesUnpaid} facture(s) en attente
          </p>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Répartition par classe */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Effectifs par classe</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={classDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }}
              />
              <Bar dataKey="students" name="Élèves" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="capacity" name="Capacité" fill="#e4e4e7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Évolution recettes */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Évolution des recettes (6 mois)</h3>
          {revenueHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(value) => formatGNF(value)}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }}
                />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5}
                      dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-surface-400 text-sm">
              Pas encore de données suffisantes
            </div>
          )}
        </Card>
      </div>

      {/* Liste des absents du jour */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-4">
          Absences & retards aujourd'hui
        </h3>
        {absentStudents.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">
            Aucune absence signalée aujourd'hui
          </p>
        ) : (
          <div className="space-y-2">
            {absentStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50">
                <Avatar firstName={s.first_name} lastName={s.last_name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-xs text-surface-500">{s.class_name}</p>
                </div>
                <Badge variant={s.status === 'absent' ? 'danger' : 'warning'}>
                  {s.status === 'absent' ? 'Absent' : 'Retard'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Routeur du module Directeur ───────────────────────────────
export default function DirectorDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="presences" element={<DirectorAttendance />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="annonces" element={<AnnouncementsPage />} />
      {/* Les autres sous-routes (élèves, personnel, classes, finances...)
          seront ajoutées dans les prochaines instructions */}
    </Routes>
  )
}

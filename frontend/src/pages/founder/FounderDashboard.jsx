import { Routes, Route } from 'react-router-dom'
import {
  GraduationCap, Users, BookOpen, Building2,
  Wallet, AlertTriangle, TrendingUp, UserPlus, MapPin
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, LineChart, Line
} from 'recharts'
import { useFounderOverview } from '@/hooks/useFounderData'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'
import MessagesPage from '@/pages/communication/MessagesPage'
import AnnouncementsPage from '@/pages/communication/AnnouncementsPage'
import FounderSchools from './FounderSchools'
import FounderSchoolDetail from './FounderSchoolDetail'
import FounderFinances from './FounderFinances'
import FounderReports from './FounderReports'

// ── Vue d'ensemble du réseau ──────────────────────────────────
function Overview() {
  const { data, isLoading, error } = useFounderOverview()

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

  const { networkName, totals, schools, revenueHistory, newStudentsThisMonth } = data

  // Données du graphique « recettes par école »
  const revenueBySchool = schools.map(s => ({
    name:    s.shortName || s.name,
    recettes: s.revenueMonth,
  }))

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          Tableau de bord du réseau
        </h1>
        <p className="text-surface-500 mt-1">
          {networkName} · {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Chiffres clés consolidés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Écoles"      value={totals.schools}  icon={Building2}     color="brand" />
        <StatCard label="Élèves"      value={totals.students} icon={GraduationCap} color="blue" />
        <StatCard label="Enseignants" value={totals.teachers} icon={Users}         color="purple" />
        <StatCard label="Classes"     value={totals.classes}  icon={BookOpen}      color="green" />
      </div>

      {/* Finances consolidées + croissance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Recettes du mois (réseau)</h3>
            <Wallet size={16} className="text-surface-400" />
          </div>
          <p className="text-3xl font-bold font-display text-surface-900">
            {formatGNF(totals.revenueThisMonth)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-600">
            <TrendingUp size={14} />
            <span>Toutes écoles confondues</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Impayés totaux</h3>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-bold font-display text-red-600">
            {formatGNF(totals.totalUnpaid)}
          </p>
          <p className="text-sm text-surface-500 mt-2">Sur l'ensemble du réseau</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Nouvelles inscriptions</h3>
            <UserPlus size={16} className="text-brand-500" />
          </div>
          <p className="text-3xl font-bold font-display text-brand-600">
            {newStudentsThisMonth}
          </p>
          <p className="text-sm text-surface-500 mt-2">Élèves inscrits ce mois</p>
        </Card>
      </div>

      {/* Cartes par école */}
      <div>
        <h3 className="font-semibold text-surface-900 mb-3">Écoles du réseau</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map((s) => (
            <Card key={s.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Building2 size={22} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900 leading-tight">{s.name}</p>
                    <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {s.city}
                    </p>
                  </div>
                </div>
                <Badge variant={s.plan === 'premium' ? 'primary' : 'default'}>
                  {s.plan === 'premium' ? '✦ Premium' : 'Gratuit'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{s.students}</p>
                  <p className="text-[11px] text-surface-500">Élèves</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{s.teachers}</p>
                  <p className="text-[11px] text-surface-500">Profs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{s.classes}</p>
                  <p className="text-[11px] text-surface-500">Classes</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                <div>
                  <p className="text-[11px] text-surface-500">Recettes ce mois</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatGNF(s.revenueMonth)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-surface-500">Impayés</p>
                  <p className="text-sm font-semibold text-red-600">{formatGNF(s.unpaid)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recettes par école (comparaison) */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recettes par école (ce mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueBySchool}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false}
                     tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
              <Tooltip
                formatter={(value) => formatGNF(value)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }}
              />
              <Bar dataKey="recettes" name="Recettes" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Évolution recettes consolidées 6 mois */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recettes consolidées (6 mois)</h3>
          {revenueHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
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
    </div>
  )
}

// ── Routeur du module Fondateur ───────────────────────────────
export default function FounderDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="ecoles" element={<FounderSchools />} />
      <Route path="ecoles/:id" element={<FounderSchoolDetail />} />
      <Route path="finances" element={<FounderFinances />} />
      <Route path="rapports" element={<FounderReports />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="annonces" element={<AnnouncementsPage />} />
    </Routes>
  )
}

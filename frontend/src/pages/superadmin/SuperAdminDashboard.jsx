import { Routes, Route } from 'react-router-dom'
import {
  Building2, Users, DollarSign, Sparkles,
  CheckCircle2, PauseCircle, TrendingUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { useSuperAdminOverview } from '@/hooks/useSuperAdminData'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const PLAN_COLORS = { premium: '#6366f1', free: '#cbd5e1' }

// ── Vue d'ensemble de la plateforme ───────────────────────────
function Overview() {
  const { data, isLoading, error } = useSuperAdminOverview()

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

  const { schools, usersTotal, mrr, premiumPrice, recentSchools, signupHistory } = data

  const planData = [
    { name: 'Premium', value: schools.premium, key: 'premium' },
    { name: 'Gratuit', value: schools.free,    key: 'free' },
  ]

  const activePct    = schools.total ? Math.round((schools.active / schools.total) * 100) : 0
  const suspendedPct = schools.total ? Math.round((schools.suspended / schools.total) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          Plateforme EduConnect
        </h1>
        <p className="text-surface-500 mt-1">
          Vue globale SaaS · {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Chiffres clés plateforme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Écoles inscrites" value={schools.total} icon={Building2} color="brand" />
        <StatCard label="Utilisateurs"     value={usersTotal}    icon={Users}    color="blue" />
        <StatCard label="MRR estimé"       value={formatGNF(mrr)} icon={DollarSign} color="green" />
        <StatCard label="Écoles premium"   value={schools.premium} icon={Sparkles} color="purple" />
      </div>

      {/* État des écoles + Répartition par plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Actives / Suspendues */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">État des écoles</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" /> Actives
              </span>
              <span className="text-sm font-semibold text-surface-900">{schools.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <PauseCircle size={15} className="text-red-500" /> Suspendues
              </span>
              <span className="text-sm font-semibold text-surface-900">{schools.suspended}</span>
            </div>
            <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mt-2 flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${activePct}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${suspendedPct}%` }} />
            </div>
          </div>
        </Card>

        {/* Répartition par plan (donut) */}
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-surface-900 mb-4">Répartition par plan</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name"
                     innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {planData.map((entry) => (
                    <Cell key={entry.key} fill={PLAN_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: PLAN_COLORS.premium }} />
                <span className="text-sm text-surface-600">Premium</span>
                <span className="text-sm font-semibold text-surface-900 ml-auto">{schools.premium}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: PLAN_COLORS.free }} />
                <span className="text-sm text-surface-600">Gratuit</span>
                <span className="text-sm font-semibold text-surface-900 ml-auto">{schools.free}</span>
              </div>
              <p className="text-[11px] text-surface-400 pt-2 border-t border-surface-100">
                MRR = {schools.premium} × {formatGNF(premiumPrice)}/mois
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Croissance plateforme + écoles récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inscriptions par mois */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Croissance plateforme (6 mois)</h3>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          {signupHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={signupHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
                <Bar dataKey="total" name="Écoles inscrites" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-surface-400 text-sm">
              Pas encore de données suffisantes
            </div>
          )}
        </Card>

        {/* Écoles récemment inscrites */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Écoles récemment inscrites</h3>
          <div className="space-y-2">
            {recentSchools.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{s.name}</p>
                  <p className="text-xs text-surface-500">
                    {s.city} · {s.type === 'public' ? 'Public' : 'Privé'} · {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={s.plan === 'premium' ? 'primary' : 'default'}>
                    {s.plan === 'premium' ? '✦ Premium' : 'Gratuit'}
                  </Badge>
                  {!s.isActive && <Badge variant="danger">Suspendue</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Routeur du module Super Admin ─────────────────────────────
export default function SuperAdminDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
    </Routes>
  )
}

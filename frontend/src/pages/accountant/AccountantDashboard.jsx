import { Routes, Route } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Percent, Scale,
  CreditCard, ArrowDownCircle
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts'
import { useAccountantOverview } from '@/hooks/useAccountantData'
import { useAuth } from '@/hooks/useAuth'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'
import AccountantPayments from './AccountantPayments'
import AccountantExpenses from './AccountantExpenses'
import AccountantReports from './AccountantReports'

const METHOD_LABELS = {
  cash:         'Espèces',
  orange_money: 'Orange Money',
  mtn_money:    'MTN Money',
  bank:         'Virement bancaire',
  other:        'Autre',
}
const METHOD_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#cbd5e1']

function Overview() {
  const { data, isLoading, error } = useAccountantOverview()
  const { user } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>
  }
  if (error) {
    return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement des données.</p></Card>
  }

  const { finances, paymentMethods, recentPayments, revenueHistory } = data

  const methodData = paymentMethods.map((m, i) => ({
    name:  METHOD_LABELS[m.method] || m.method,
    value: m.total,
    color: METHOD_COLORS[i % METHOD_COLORS.length],
  }))

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          Finances
        </h1>
        <p className="text-surface-500 mt-1">
          {user?.school_name} · {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recettes ce mois"   value={formatGNF(finances.revenueThisMonth)} icon={Wallet}       color="green" />
        <StatCard label="Dépenses ce mois"   value={formatGNF(finances.expensesThisMonth ?? 0)} icon={TrendingDown} color="red" />
        <StatCard label="Solde net du mois"  value={formatGNF(finances.netBalance ?? finances.revenueThisMonth)}
          icon={Scale} color={(finances.netBalance ?? 0) >= 0 ? 'brand' : 'amber'} />
        <StatCard label="Taux de recouvrement" value={`${finances.collectionRate}%`}     icon={Percent}      color="purple" />
      </div>

      {/* Recouvrement (barre) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-900">Recouvrement des frais</h3>
          <span className="text-sm font-semibold text-surface-700">
            {formatGNF(finances.totalPaid)} / {formatGNF(finances.totalDue)}
          </span>
        </div>
        <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${finances.collectionRate}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-surface-500">
          <span>{finances.collectionRate}% encaissé</span>
          <span>{finances.invoicesUnpaid} facture(s) en attente</span>
        </div>
      </Card>

      {/* Graphiques : évolution + moyens de paiement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Évolution des recettes */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Évolution des recettes (6 mois)</h3>
          {revenueHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => formatGNF(value)}
                         contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5}
                      dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-surface-400 text-sm">
              Pas encore de données suffisantes
            </div>
          )}
        </Card>

        {/* Moyens de paiement */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Moyens de paiement</h3>
          {methodData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {methodData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatGNF(value)}
                           contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {methodData.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                    <span className="text-sm text-surface-600">{m.name}</span>
                    <span className="text-sm font-semibold text-surface-900 ml-auto">{formatGNF(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-surface-400 text-sm">
              Aucun paiement enregistré
            </div>
          )}
        </Card>
      </div>

      {/* Derniers paiements */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-900">Derniers paiements reçus</h3>
          <CreditCard size={16} className="text-surface-400" />
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">Aucun paiement enregistré</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <ArrowDownCircle size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{p.studentName}</p>
                  <p className="text-xs text-surface-500">
                    {METHOD_LABELS[p.method] || p.method} · {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 shrink-0">+{formatGNF(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function AccountantDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="paiements" element={<AccountantPayments />} />
      <Route path="depenses" element={<AccountantExpenses />} />
      <Route path="rapports" element={<AccountantReports />} />
    </Routes>
  )
}

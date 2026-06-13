import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line,
} from 'recharts'
import { Wallet, AlertTriangle } from 'lucide-react'
import { useFounderOverview } from '@/hooks/useFounderData'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

export default function FounderFinances() {
  const { data, isLoading, error } = useFounderOverview()
  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  const revenueBySchool = data.schools.map(s => ({ name: s.shortName || s.name, recettes: s.revenueMonth }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Finances du réseau</h1>
        <p className="text-surface-500 mt-1">{data.networkName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Recettes du mois (réseau)</h3>
            <Wallet size={16} className="text-surface-400" />
          </div>
          <p className="text-3xl font-bold font-display text-surface-900">{formatGNF(data.totals.revenueThisMonth)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Impayés totaux</h3>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-bold font-display text-red-600">{formatGNF(data.totals.totalUnpaid)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recettes par école (ce mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueBySchool}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v) => formatGNF(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
              <Bar dataKey="recettes" name="Recettes" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Recettes consolidées (6 mois)</h3>
          {data.revenueHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => formatGNF(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-surface-400 text-sm">Pas encore de données</div>}
        </Card>
      </div>
    </div>
  )
}

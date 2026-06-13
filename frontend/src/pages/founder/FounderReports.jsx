import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useFounderReport } from '@/hooks/useReports'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function FounderReports() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data, isLoading } = useFounderReport(month, year)

  const chartData = (data?.schools || []).map(s => ({ name: s.shortName || s.name, Recettes: s.revenue, Dépenses: s.expenses }))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Rapports du réseau</h1>
          <p className="text-surface-500 mt-1">{data?.networkName} · comparatif des écoles</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {[year + 1, year, year - 1, year - 2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center h-40 items-center"><Spinner /></div>
      ) : (
        <>
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Recettes vs dépenses par école ({MONTHS[month - 1]} {year})</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => formatGNF(v)} contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                <Legend />
                <Bar dataKey="Recettes" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card padding={false}>
            <div className="overflow-x-auto"><div className="min-w-[620px]">
            <div className="grid grid-cols-12 px-4 py-2 border-b border-surface-100 text-xs font-medium text-surface-500">
              <span className="col-span-4">École</span>
              <span className="col-span-2 text-right">Recettes</span>
              <span className="col-span-2 text-right">Dépenses</span>
              <span className="col-span-2 text-right">Solde net</span>
              <span className="col-span-2 text-right">Réussite</span>
            </div>
            {data.schools.map(s => (
              <div key={s.id} className="grid grid-cols-12 px-4 py-3 border-b border-surface-50 items-center">
                <div className="col-span-4">
                  <p className="text-sm font-medium text-surface-900">{s.name}</p>
                  <p className="text-[11px] text-surface-500">{s.city}</p>
                </div>
                <span className="col-span-2 text-right text-sm text-emerald-600 font-medium">{formatGNF(s.revenue)}</span>
                <span className="col-span-2 text-right text-sm text-red-600 font-medium">{formatGNF(s.expenses)}</span>
                <span className={`col-span-2 text-right text-sm font-semibold ${s.net >= 0 ? 'text-surface-900' : 'text-amber-600'}`}>{formatGNF(s.net)}</span>
                <span className="col-span-2 text-right">
                  {s.successRate != null ? <Badge variant={s.successRate >= 75 ? 'success' : 'warning'}>{s.successRate}%</Badge> : <span className="text-sm text-surface-400">—</span>}
                </span>
              </div>
            ))}
            </div></div>
          </Card>
        </>
      )}
    </div>
  )
}

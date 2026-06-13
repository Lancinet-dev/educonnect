import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useFinancialReport, downloadReport } from '@/hooks/useReports'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MSHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function FinancialReportView() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data, isLoading } = useFinancialReport(month, year)

  const chartData = (data?.monthly || []).map(m => ({ name: MSHORT[m.month - 1], Recettes: m.revenue, Dépenses: m.expenses }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <Button variant="secondary" icon={<Download size={16} />}
          onClick={() => downloadReport('/reports/financial.pdf', `rapport-financier-${month}-${year}.pdf`, { month, year })}>
          Télécharger le PDF
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center h-40 items-center"><Spinner /></div>
      ) : (
        <>
          {/* Synthèse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-700"><TrendingUp size={18} /><span className="text-sm font-medium">Recettes</span></div>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{formatGNF(data.totals.revenue)}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 text-red-700"><TrendingDown size={18} /><span className="text-sm font-medium">Dépenses</span></div>
              <p className="text-2xl font-bold text-red-700 mt-1">{formatGNF(data.totals.expenses)}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${data.totals.net >= 0 ? 'border-brand-200 bg-brand-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className={`flex items-center gap-2 ${data.totals.net >= 0 ? 'text-brand-700' : 'text-amber-700'}`}><Scale size={18} /><span className="text-sm font-medium">Solde net</span></div>
              <p className={`text-2xl font-bold mt-1 ${data.totals.net >= 0 ? 'text-brand-700' : 'text-amber-700'}`}>{formatGNF(data.totals.net)}</p>
            </div>
          </div>

          {/* Détails recettes / dépenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-surface-900 mb-3">Recettes par type</h3>
              {data.revenueByType.length === 0 ? <p className="text-sm text-surface-500 py-4 text-center">Aucune recette ce mois.</p> : (
                <div className="space-y-2">
                  {data.revenueByType.map(r => (
                    <div key={r.type} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50">
                      <span className="text-sm text-surface-700">{r.label}</span>
                      <span className="text-sm font-semibold text-emerald-600">{formatGNF(r.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-surface-900 mb-3">Dépenses par catégorie</h3>
              {data.expensesByCategory.length === 0 ? <p className="text-sm text-surface-500 py-4 text-center">Aucune dépense ce mois.</p> : (
                <div className="space-y-2">
                  {data.expensesByCategory.map(c => (
                    <div key={c.category} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50">
                      <span className="text-sm text-surface-700">{c.label}</span>
                      <span className="text-sm font-semibold text-red-600">−{formatGNF(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Évolution annuelle */}
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Évolution sur l'année {year}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v) => formatGNF(v)} contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                <Legend />
                <Line type="monotone" dataKey="Recettes" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  )
}

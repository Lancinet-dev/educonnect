import { useState } from 'react'
import { Download, AlertTriangle, PieChart as PieIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'
import { useDirectorFinance, useFinanceClasses, downloadUnpaidCsv } from '@/hooks/useFinance'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

export default function DirectorFinances() {
  const [classId, setClassId] = useState('')
  const { data, isLoading } = useDirectorFinance(classId)
  const { data: cl } = useFinanceClasses()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Finances</h1>
        <p className="text-surface-500 mt-1">Recettes par type de frais et suivi des impayés</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-60 items-center"><Spinner /></div>
      ) : !data ? (
        <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>
      ) : (
        <>
          {/* Recettes par type */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900">Recettes par type de frais</h3>
              <PieIcon size={16} className="text-surface-400" />
            </div>
            {data.revenueByType.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-6">Aucune recette enregistrée.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
                    <XAxis dataKey="typeLabel" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false}
                           tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => formatGNF(v)}
                             contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }} />
                    <Bar dataKey="total" name="Recettes" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.revenueByType.map(r => (
                    <div key={r.type} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50">
                      <span className="text-sm text-surface-700">{r.typeLabel}</span>
                      <span className="text-sm font-semibold text-surface-900">{formatGNF(r.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Impayés */}
          <Card>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Élèves avec impayés ({data.unpaid.length})
              </h3>
              <div className="flex items-center gap-2">
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Toutes les classes</option>
                  {cl?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={downloadUnpaidCsv}>
                  Export CSV
                </Button>
              </div>
            </div>

            {data.unpaid.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-6">Aucun impayé 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                      <th className="pb-2 font-medium">Élève</th>
                      <th className="pb-2 font-medium">Classe</th>
                      <th className="pb-2 font-medium text-right">Solde dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {data.unpaid.map(u => (
                      <tr key={u.id} className="hover:bg-surface-50">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar firstName={u.firstName} lastName={u.lastName} size="sm" />
                            <span className="font-medium text-surface-900">{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-surface-600">{u.className || '—'}</td>
                        <td className="py-2.5 text-right font-semibold text-red-600">{formatGNF(u.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

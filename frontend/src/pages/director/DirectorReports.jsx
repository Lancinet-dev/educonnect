import { useState } from 'react'
import { Download, Wallet, GraduationCap, ClipboardList } from 'lucide-react'
import { useAcademicReport, downloadReport } from '@/hooks/useReports'
import { useDirectorAttendanceStats } from '@/hooks/useAttendance'
import FinancialReportView from '@/pages/shared/FinancialReportView'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

function AcademicReport() {
  const { data, isLoading } = useAcademicReport()
  if (isLoading || !data) return <div className="flex justify-center h-40 items-center"><Spinner /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2">
            <p className="text-[11px] text-surface-500 uppercase">Moyenne école</p>
            <p className="text-xl font-bold text-brand-700">{data.schoolAverage != null ? `${data.schoolAverage}/20` : '—'}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <p className="text-[11px] text-surface-500 uppercase">Taux de réussite</p>
            <p className="text-xl font-bold text-emerald-700">{data.overallSuccessRate != null ? `${data.overallSuccessRate}%` : '—'}</p>
          </div>
        </div>
        <Button variant="secondary" icon={<Download size={16} />}
          onClick={() => downloadReport('/reports/academic.pdf', 'rapport-academique.pdf')}>
          Télécharger le PDF
        </Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto"><div className="min-w-[480px]">
        <div className="grid grid-cols-12 px-4 py-2 border-b border-surface-100 text-xs font-medium text-surface-500">
          <span className="col-span-5">Classe</span><span className="col-span-3 text-right">Moyenne</span>
          <span className="col-span-3 text-right">Réussite</span><span className="col-span-1 text-right">Élèves</span>
        </div>
        {data.classes.map(c => (
          <div key={c.id} className="grid grid-cols-12 px-4 py-3 border-b border-surface-50 items-center">
            <span className="col-span-5 text-sm font-medium text-surface-900">{c.name}</span>
            <span className="col-span-3 text-right text-sm font-semibold text-surface-900">{c.average != null ? `${c.average}/20` : '—'}</span>
            <span className="col-span-3 text-right">
              {c.successRate != null
                ? <Badge variant={c.successRate >= 75 ? 'success' : c.successRate >= 50 ? 'warning' : 'danger'}>{c.successRate}%</Badge>
                : <span className="text-sm text-surface-400">—</span>}
            </span>
            <span className="col-span-1 text-right text-sm text-surface-500">{c.students}</span>
          </div>
        ))}
        {data.classes.length === 0 && <p className="text-center text-surface-500 text-sm py-8">Aucune donnée.</p>}
        </div></div>
      </Card>
    </div>
  )
}

function AttendanceReport() {
  const { data: stats, isLoading } = useDirectorAttendanceStats()
  if (isLoading || !stats) return <div className="flex justify-center h-40 items-center"><Spinner /></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm text-surface-600">Présence ce mois</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.month.presenceRate != null ? `${stats.month.presenceRate}%` : '—'}</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <p className="text-sm text-surface-600">Présence (7 derniers jours)</p>
          <p className="text-2xl font-bold text-brand-700">{stats.weekPresenceRate != null ? `${stats.weekPresenceRate}%` : '—'}</p>
        </div>
      </div>
      <Card>
        <h3 className="font-semibold text-surface-900 mb-3">Taux de présence par classe (ce mois)</h3>
        <div className="space-y-2">
          {stats.ranking.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-50">
              <span className="flex-1 text-sm font-medium text-surface-900">{r.name}</span>
              <div className="w-32 h-2 bg-surface-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${r.presenceRate ?? 0}%` }} />
              </div>
              <span className="w-12 text-right text-sm font-semibold text-surface-900">{r.presenceRate != null ? `${r.presenceRate}%` : '—'}</span>
            </div>
          ))}
          {stats.ranking.every(r => r.total === 0) && <p className="text-center text-surface-500 text-sm py-4">Pas encore de données ce mois.</p>}
        </div>
      </Card>
    </div>
  )
}

const TABS = [
  { key: 'financial', label: 'Financier', icon: Wallet },
  { key: 'academic', label: 'Académique', icon: GraduationCap },
  { key: 'attendance', label: 'Présences', icon: ClipboardList },
]

export default function DirectorReports() {
  const [tab, setTab] = useState('financial')
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Rapports</h1>
        <p className="text-surface-500 mt-1">Synthèses financières, académiques et de présence</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>
      {tab === 'financial' && <FinancialReportView />}
      {tab === 'academic' && <AcademicReport />}
      {tab === 'attendance' && <AttendanceReport />}
    </div>
  )
}

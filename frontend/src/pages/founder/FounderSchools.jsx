import { Building2, MapPin } from 'lucide-react'
import { useFounderOverview } from '@/hooks/useFounderData'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

export default function FounderSchools() {
  const { data, isLoading, error } = useFounderOverview()
  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Mes écoles</h1>
        <p className="text-surface-500 mt-1">{data.networkName} · {data.schools.length} école(s)</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.schools.map(s => (
          <Card key={s.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-surface-900 leading-tight">{s.name}</p>
                  <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {s.city}</p>
                </div>
              </div>
              <Badge variant={s.plan === 'premium' ? 'primary' : 'default'}>{s.plan === 'premium' ? '✦ Premium' : 'Gratuit'}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-surface-50"><p className="text-lg font-bold text-surface-900">{s.students}</p><p className="text-[11px] text-surface-500">Élèves</p></div>
              <div className="text-center p-2 rounded-lg bg-surface-50"><p className="text-lg font-bold text-surface-900">{s.teachers}</p><p className="text-[11px] text-surface-500">Profs</p></div>
              <div className="text-center p-2 rounded-lg bg-surface-50"><p className="text-lg font-bold text-surface-900">{s.classes}</p><p className="text-[11px] text-surface-500">Classes</p></div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-surface-100">
              <div><p className="text-[11px] text-surface-500">Recettes ce mois</p><p className="text-sm font-semibold text-emerald-600">{formatGNF(s.revenueMonth)}</p></div>
              <div className="text-right"><p className="text-[11px] text-surface-500">Impayés</p><p className="text-sm font-semibold text-red-600">{formatGNF(s.unpaid)}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

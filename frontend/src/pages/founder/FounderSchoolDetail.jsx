import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GraduationCap, Users, BookOpen, Wallet, AlertTriangle, Scale, MapPin,
} from 'lucide-react'
import { useFounderSchoolDetail } from '@/hooks/useFounderData'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

export default function FounderSchoolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useFounderSchoolDetail(id)

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return (
    <Card className="text-center py-12">
      <p className="text-red-600">{error?.response?.data?.error || 'Accès refusé.'}</p>
      <Button variant="ghost" className="mt-3" icon={<ArrowLeft size={16} />} onClick={() => navigate('/founder/ecoles')}>Retour</Button>
    </Card>
  )

  const { school, counts, classes, finances, unpaid } = data

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/founder/ecoles')}>Mes écoles</Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">{school.name}</h1>
          <p className="text-surface-500 mt-1 flex items-center gap-1">
            <MapPin size={14} /> {school.city || '—'}{school.region ? `, ${school.region}` : ''} · {school.type === 'public' ? 'Public' : 'Privé'}
          </p>
        </div>
        <Badge variant={school.plan === 'premium' ? 'primary' : 'default'}>{school.plan === 'premium' ? '✦ Premium' : 'Gratuit'}</Badge>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Élèves" value={counts.students} icon={GraduationCap} color="brand" />
        <StatCard label="Enseignants" value={counts.teachers} icon={Users} color="blue" />
        <StatCard label="Classes" value={counts.classes} icon={BookOpen} color="purple" />
      </div>

      {/* Finances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Recettes ce mois" value={formatGNF(finances.revenueThisMonth)} icon={Wallet} color="green" />
        <StatCard label="Solde net du mois" value={formatGNF(finances.netBalance)} icon={Scale} color={finances.netBalance >= 0 ? 'brand' : 'amber'} />
        <StatCard label="Impayés" value={formatGNF(finances.totalUnpaid)} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Classes */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-3">Classes & effectifs</h3>
          {classes.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Aucune classe — école en cours de configuration.</p>
          ) : (
            <div className="space-y-2">
              {classes.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-50">
                  <BookOpen size={16} className="text-surface-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-surface-900">{c.name}</span>
                  <span className="text-xs text-surface-500">{c.level || ''}</span>
                  <Badge variant="default">{c.students} élèves</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Impayés */}
        <Card>
          <h3 className="font-semibold text-surface-900 mb-3">Principaux impayés</h3>
          {unpaid.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Aucun impayé 🎉</p>
          ) : (
            <div className="space-y-2">
              {unpaid.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-50">
                  <span className="text-sm font-medium text-surface-900">{u.name}</span>
                  <span className="text-sm font-semibold text-red-600">{formatGNF(u.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

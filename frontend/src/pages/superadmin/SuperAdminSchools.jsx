import toast from 'react-hot-toast'
import { Building2, Sparkles, CheckCircle2, PauseCircle } from 'lucide-react'
import { useSuperAdminSchools, useChangeSchoolPlan, useToggleSchoolActive } from '@/hooks/useSuperAdminData'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export default function SuperAdminSchools() {
  const { data: schools, isLoading } = useSuperAdminSchools()
  const changePlan = useChangeSchoolPlan()
  const toggleActive = useToggleSchoolActive()

  const setPlan = async (s, plan) => {
    try { await changePlan.mutateAsync({ id: s.id, plan }); toast.success(`${s.name} → ${plan === 'premium' ? 'Premium' : 'Gratuit'}`) }
    catch { toast.error('Échec du changement de plan.') }
  }
  const setActive = async (s) => {
    try { await toggleActive.mutateAsync({ id: s.id, isActive: !s.isActive }) }
    catch { toast.error('Action impossible.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Écoles</h1>
        <p className="text-surface-500 mt-1">Gérez les abonnements de la plateforme</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-surface-50">
            {schools.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-4 flex-wrap ${!s.isActive ? 'opacity-60' : ''}`}>
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-surface-900">{s.name}</p>
                    <Badge variant={s.plan === 'premium' ? 'primary' : 'default'}>
                      {s.plan === 'premium' ? '✦ Premium' : 'Gratuit'}
                    </Badge>
                    {!s.isActive && <Badge variant="danger">Suspendue</Badge>}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {s.city || '—'} · {s.type === 'public' ? 'Public' : 'Privé'} · {s.students} élèves · {s.classes} classes · inscrite le {fmtDate(s.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {s.plan === 'free' ? (
                    <Button size="sm" icon={<Sparkles size={14} />} loading={changePlan.isPending}
                      onClick={() => setPlan(s, 'premium')}>Passer en Premium</Button>
                  ) : (
                    <Button variant="secondary" size="sm" loading={changePlan.isPending}
                      onClick={() => setPlan(s, 'free')}>Repasser en Gratuit</Button>
                  )}
                  <button onClick={() => setActive(s)} title={s.isActive ? 'Suspendre' : 'Réactiver'}
                    className={`p-2 rounded-lg hover:bg-surface-100 ${s.isActive ? 'text-red-500' : 'text-emerald-500'}`}>
                    {s.isActive ? <PauseCircle size={18} /> : <CheckCircle2 size={18} />}
                  </button>
                </div>
              </div>
            ))}
            {schools.length === 0 && <p className="text-center text-surface-500 text-sm py-12">Aucune école.</p>}
          </div>
        </Card>
      )}
    </div>
  )
}

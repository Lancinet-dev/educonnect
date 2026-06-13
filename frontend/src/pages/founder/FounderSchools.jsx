import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, MapPin, Plus, X, ChevronRight } from 'lucide-react'
import { useFounderOverview, useAddNetworkSchool } from '@/hooks/useFounderData'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const inputCls = 'w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function AddSchoolModal({ onClose }) {
  const add = useAddNetworkSchool()
  const [s, setS] = useState({ name: '', type: 'private', city: '', region: '', phone: '', email: '', plan: 'free' })
  const [a, setA] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const setS_ = (k) => (e) => setS(v => ({ ...v, [k]: e.target.value }))
  const setA_ = (k) => (e) => setA(v => ({ ...v, [k]: e.target.value }))

  const submit = async () => {
    if (!s.name.trim()) return toast.error("Nom de l'école requis.")
    if (!a.firstName.trim() || !a.lastName.trim() || !a.email.trim()) return toast.error('Compte directeur incomplet.')
    if (a.password.length < 8) return toast.error('Mot de passe : 8 caractères minimum.')
    try { await add.mutateAsync({ school: s, admin: a }); toast.success('École ajoutée au réseau'); onClose() }
    catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Ajouter une école au réseau</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-surface-900 mb-2 uppercase tracking-wide text-xs">École</p>
            <div className="space-y-3">
              <input value={s.name} onChange={setS_('name')} placeholder="Nom de l'école *" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <select value={s.type} onChange={setS_('type')} className={inputCls}><option value="private">Privée</option><option value="public">Publique</option></select>
                <select value={s.plan} onChange={setS_('plan')} className={inputCls}><option value="free">Gratuit</option><option value="premium">Premium</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={s.city} onChange={setS_('city')} placeholder="Ville" className={inputCls} />
                <input value={s.region} onChange={setS_('region')} placeholder="Région" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={s.phone} onChange={setS_('phone')} placeholder="Téléphone" className={inputCls} />
                <input value={s.email} onChange={setS_('email')} placeholder="Email école" className={inputCls} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-900 mb-2 uppercase tracking-wide text-xs">Directeur de l'école</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={a.firstName} onChange={setA_('firstName')} placeholder="Prénom *" className={inputCls} />
                <input value={a.lastName} onChange={setA_('lastName')} placeholder="Nom *" className={inputCls} />
              </div>
              <input type="email" value={a.email} onChange={setA_('email')} placeholder="Email de connexion *" className={inputCls} />
              <input type="password" value={a.password} onChange={setA_('password')} placeholder="Mot de passe (8 car. min.) *" className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={add.isPending} onClick={submit}>Créer l'école</Button>
        </div>
      </div>
    </div>
  )
}

export default function FounderSchools() {
  const { data, isLoading, error } = useFounderOverview()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Mes écoles</h1>
          <p className="text-surface-500 mt-1">{data.networkName} · {data.schools.length} école(s)</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setModal(true)}>Ajouter une école</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.schools.map(s => (
          <button key={s.id} onClick={() => navigate(`/founder/ecoles/${s.id}`)} className="text-left">
            <Card hover>
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
                <div className="flex items-center gap-2">
                  <Badge variant={s.plan === 'premium' ? 'primary' : 'default'}>{s.plan === 'premium' ? '✦ Premium' : 'Gratuit'}</Badge>
                  <ChevronRight size={18} className="text-surface-300" />
                </div>
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
          </button>
        ))}
      </div>

      {modal && <AddSchoolModal onClose={() => setModal(false)} />}
    </div>
  )
}

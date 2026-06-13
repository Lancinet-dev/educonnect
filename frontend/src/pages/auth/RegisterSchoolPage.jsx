import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const inputCls = 'w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function RegisterSchoolPage() {
  const { register, isRegistering } = useAuth()
  const [error, setError] = useState('')
  const [s, setS] = useState({ name: '', type: 'private', city: '', region: '', phone: '', email: '' })
  const [a, setA] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [plan, setPlan] = useState('free')
  const setS_ = (k) => (e) => setS(v => ({ ...v, [k]: e.target.value }))
  const setA_ = (k) => (e) => setA(v => ({ ...v, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!s.name.trim()) return setError("Le nom de l'école est requis.")
    if (!a.firstName.trim() || !a.lastName.trim() || !a.email.trim()) return setError('Renseignez le compte administrateur.')
    if (a.password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.')
    try {
      await register({ school: { ...s, plan }, admin: a })
    } catch (err) {
      setError(err?.response?.data?.error || "Échec de l'inscription. Réessayez.")
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Créer mon école</h1>
          <p className="text-surface-500 text-sm mt-1">Inscrivez votre établissement sur EduConnect en 1 minute</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-surface-200 shadow-lg p-6 sm:p-8 space-y-6">

          {/* École */}
          <div>
            <h2 className="text-sm font-semibold text-surface-900 mb-3 uppercase tracking-wide">Votre école</h2>
            <div className="space-y-3">
              <input value={s.name} onChange={setS_('name')} placeholder="Nom de l'école *" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <select value={s.type} onChange={setS_('type')} className={inputCls}>
                  <option value="private">Privée</option>
                  <option value="public">Publique</option>
                </select>
                <input value={s.phone} onChange={setS_('phone')} placeholder="Téléphone" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={s.city} onChange={setS_('city')} placeholder="Ville" className={inputCls} />
                <input value={s.region} onChange={setS_('region')} placeholder="Région" className={inputCls} />
              </div>
              <input value={s.email} onChange={setS_('email')} placeholder="Email de l'école" className={inputCls} />
            </div>
          </div>

          {/* Compte directeur */}
          <div>
            <h2 className="text-sm font-semibold text-surface-900 mb-3 uppercase tracking-wide">Votre compte (directeur)</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={a.firstName} onChange={setA_('firstName')} placeholder="Prénom *" className={inputCls} />
                <input value={a.lastName} onChange={setA_('lastName')} placeholder="Nom *" className={inputCls} />
              </div>
              <input type="email" value={a.email} onChange={setA_('email')} placeholder="Email de connexion *" autoComplete="email" className={inputCls} />
              <input type="password" value={a.password} onChange={setA_('password')} placeholder="Mot de passe (8 caractères min.) *" autoComplete="new-password" className={inputCls} />
            </div>
          </div>

          {/* Plan */}
          <div>
            <h2 className="text-sm font-semibold text-surface-900 mb-3 uppercase tracking-wide">Votre formule</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'free', title: 'Gratuit', desc: 'Jusqu\'à 3 classes', items: ['3 classes max', 'Présences & notes', 'Messagerie'] },
                { key: 'premium', title: 'Premium', desc: 'Tout illimité', items: ['Classes illimitées', 'Exports & rapports', 'Toutes les fonctions'] },
              ].map(p => (
                <button type="button" key={p.key} onClick={() => setPlan(p.key)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${plan === p.key ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-surface-900">{p.title}</span>
                    {plan === p.key && <Check size={16} className="text-brand-600" />}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{p.desc}</p>
                  <ul className="mt-2 space-y-1">
                    {p.items.map(it => <li key={it} className="text-[11px] text-surface-500 flex items-center gap-1"><Check size={10} className="text-emerald-500" /> {it}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            {plan === 'premium' && (
              <p className="text-[11px] text-amber-600 mt-2">
                ℹ️ Le Premium sera activé manuellement après confirmation du paiement (Mobile Money à venir). Vous démarrez en attendant.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isRegistering} className="btn-primary w-full justify-center py-2.5">
            {isRegistering ? 'Création en cours…' : 'Créer mon école'}
          </button>
        </form>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mt-5">
          <ArrowLeft size={15} /> J'ai déjà un compte
        </Link>
      </div>
    </div>
  )
}

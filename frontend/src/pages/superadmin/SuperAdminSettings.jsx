import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, DollarSign, Sparkles } from 'lucide-react'
import { useSettings, useUpdateSettings, useSuperAdminOverview } from '@/hooks/useSuperAdminData'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

export default function SuperAdminSettings() {
  const { data: settings, isLoading } = useSettings()
  const { data: overview } = useSuperAdminOverview()
  const update = useUpdateSettings()
  const [price, setPrice] = useState('')

  useEffect(() => { if (settings) setPrice(String(settings.premiumPrice)) }, [settings])

  const save = async () => {
    const n = parseInt(price)
    if (!Number.isFinite(n) || n < 0) { toast.error('Prix invalide.'); return }
    try { await update.mutateAsync({ premiumPrice: n }); toast.success('Paramètres enregistrés') }
    catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  const premiumCount = overview?.schools?.premium ?? 0
  const projectedMrr = (parseInt(price) || 0) * premiumCount

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Paramètres</h1>
        <p className="text-surface-500 mt-1">Configuration de la plateforme</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
            <DollarSign size={22} className="text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900">Abonnement Premium</h3>
            <p className="text-xs text-surface-500">Montant mensuel facturé à chaque école Premium (GNF)</p>
          </div>
        </div>

        <label className="text-sm font-medium text-surface-700 block mb-1.5">Prix mensuel Premium</label>
        <div className="flex gap-2">
          <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <Button icon={<Save size={16} />} loading={update.isPending} onClick={save}>Enregistrer</Button>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-surface-50 flex items-center gap-3">
          <Sparkles size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-surface-600">
            MRR projeté : <span className="font-semibold text-surface-900">{formatGNF(projectedMrr)}</span>
            <span className="text-surface-400"> ({premiumCount} école{premiumCount > 1 ? 's' : ''} Premium × {formatGNF(parseInt(price) || 0)})</span>
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-surface-900 mb-1">À propos</h3>
        <p className="text-sm text-surface-500">EduConnect — plateforme scolaire de la Guinée 🇬🇳. Le paiement Mobile Money automatique sera ajouté ultérieurement ; en attendant, le Premium s'active manuellement depuis la page Écoles.</p>
      </Card>
    </div>
  )
}

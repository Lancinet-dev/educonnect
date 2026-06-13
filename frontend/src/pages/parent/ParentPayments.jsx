import { useState } from 'react'
import { Download, Wallet, Receipt, GraduationCap } from 'lucide-react'
import { useParentFinance, downloadReceipt } from '@/hooks/useFinance'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const STATUS = {
  paid:    { label: 'Payé',       variant: 'success' },
  partial: { label: 'Partiel',    variant: 'warning' },
  pending: { label: 'En attente', variant: 'danger' },
  overdue: { label: 'En retard',  variant: 'danger' },
}

export default function ParentPayments() {
  const { data, isLoading, error } = useParentFinance()
  const [activeIdx, setActiveIdx] = useState(0)

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  const children = data?.children || []
  if (children.length === 0) {
    return (
      <Card className="text-center py-12">
        <GraduationCap size={40} className="text-surface-300 mx-auto mb-3" />
        <p className="text-surface-600 font-medium">Aucun enfant rattaché à votre compte</p>
      </Card>
    )
  }

  const child = children[Math.min(activeIdx, children.length - 1)]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Paiements</h1>
        <p className="text-surface-500 mt-1">Factures et reçus de vos enfants</p>
      </div>

      {/* Sélecteur d'enfants */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => (
            <button key={c.id} onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl border transition-all ${
                i === activeIdx ? 'bg-brand-50 border-brand-300 shadow-sm' : 'bg-white border-surface-200 hover:border-surface-300'
              }`}>
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="sm" />
              <div className="text-left">
                <p className={`text-sm font-semibold leading-tight ${i === activeIdx ? 'text-brand-700' : 'text-surface-800'}`}>
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-[11px] text-surface-500">{c.className || 'Classe non définie'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Solde total */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
        child.balance <= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        <Wallet size={32} className={child.balance <= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <div>
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">Solde restant à payer</p>
          <p className={`text-2xl font-bold ${child.balance <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {child.balance <= 0 ? 'À jour ✓' : formatGNF(child.balance)}
          </p>
        </div>
      </div>

      {/* Factures */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-3">Factures</h3>
        {child.invoices.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">Aucune facture.</p>
        ) : (
          <div className="space-y-2">
            {child.invoices.map(inv => {
              const st = STATUS[inv.status] || STATUS.pending
              return (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900">{inv.label}</p>
                    <p className="text-xs text-surface-500">{inv.typeLabel} · {formatGNF(inv.amountPaid)} / {formatGNF(inv.amountDue)}</p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Historique des paiements */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-3">Historique des paiements</h3>
        {child.payments.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">Aucun paiement enregistré.</p>
        ) : (
          <div className="space-y-2">
            {child.payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">{formatGNF(p.amount)} · {p.methodLabel}</p>
                  <p className="text-xs text-surface-500">{p.receiptNumber} · {new Date(p.paidAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <Button variant="secondary" size="sm" icon={<Download size={14} />}
                  onClick={() => downloadReceipt(p.id, p.receiptNumber)}>Reçu</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

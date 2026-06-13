import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Search, Download, Plus, X, Wallet, FileText, ArrowLeft, Receipt,
} from 'lucide-react'
import {
  useFinanceStudents, useStudentInvoices, useRecordPayment,
  useCreateInvoice, useFinanceClasses, downloadReceipt,
} from '@/hooks/useFinance'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const STATUS = {
  paid:    { label: 'Payé',       variant: 'success' },
  partial: { label: 'Partiel',    variant: 'warning' },
  pending: { label: 'En attente', variant: 'danger' },
  overdue: { label: 'En retard',  variant: 'danger' },
}
const METHODS = [
  { key: 'cash', label: 'Espèces' }, { key: 'orange_money', label: 'Orange Money' },
  { key: 'mtn_money', label: 'MTN Money' }, { key: 'bank', label: 'Virement bancaire' },
  { key: 'other', label: 'Autre' },
]
const FEE_TYPES = [
  { key: 'tuition', label: 'Scolarité' }, { key: 'transport', label: 'Transport' },
  { key: 'cafeteria', label: 'Cantine' }, { key: 'uniform', label: 'Uniforme' }, { key: 'other', label: 'Autre' },
]

// ── Modale d'encaissement ─────────────────────────────────────
function PaymentModal({ invoice, onClose }) {
  const record = useRecordPayment()
  const [amount, setAmount] = useState(invoice.balance > 0 ? invoice.balance : '')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')

  const submit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Montant invalide.'); return }
    try {
      const res = await record.mutateAsync({ invoiceId: invoice.id, amount: amt, method, reference: reference || null })
      toast.success(`Paiement enregistré · Reçu ${res.payment.receiptNumber}`)
      downloadReceipt(res.payment.id, res.payment.receiptNumber)
      onClose()
    } catch { toast.error("Échec de l'enregistrement.") }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Encaisser un paiement</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-surface-50 text-sm">
            <p className="font-medium text-surface-900">{invoice.label}</p>
            <p className="text-surface-500">Reste à payer : <span className="font-semibold text-red-600">{formatGNF(invoice.balance)}</span></p>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Montant (GNF)</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Méthode</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Référence (optionnel)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="N° transaction…"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={record.isPending} onClick={submit} icon={<Receipt size={16} />}>Encaisser & reçu</Button>
        </div>
      </div>
    </div>
  )
}

// ── Modale de création de facture ─────────────────────────────
function CreateInvoiceModal({ onClose }) {
  const create = useCreateInvoice()
  const { data: cl } = useFinanceClasses()
  const [scope, setScope] = useState('student')   // student | class | level
  const [studentQuery, setStudentQuery] = useState('')
  const [studentId, setStudentId] = useState('')
  const [classId, setClassId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [type, setType] = useState('tuition')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const { data: students } = useFinanceStudents(studentQuery, '')

  const submit = async () => {
    const payload = { type, label, amount: parseFloat(amount), dueDate: dueDate || null }
    if (scope === 'student') payload.studentId = studentId
    if (scope === 'class')   payload.classId = classId
    if (scope === 'level')   payload.levelId = levelId
    if (!label.trim() || !amount) { toast.error('Libellé et montant requis.'); return }
    if (scope === 'student' && !studentId) { toast.error('Choisissez un élève.'); return }
    if (scope === 'class' && !classId) { toast.error('Choisissez une classe.'); return }
    if (scope === 'level' && !levelId) { toast.error('Choisissez un niveau.'); return }
    try {
      const res = await create.mutateAsync(payload)
      toast.success(`${res.created} facture(s) créée(s)`)
      onClose()
    } catch { toast.error('Échec de la création.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Créer une facture</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Destinataire</label>
            <div className="flex gap-1.5">
              {[['student', 'Un élève'], ['class', 'Une classe'], ['level', 'Un niveau']].map(([k, l]) => (
                <button key={k} onClick={() => setScope(k)}
                  className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium ${scope === k ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-600 border-surface-200'}`}>{l}</button>
              ))}
            </div>
          </div>

          {scope === 'student' && (
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Élève</label>
              <input value={studentQuery} onChange={e => { setStudentQuery(e.target.value); setStudentId('') }}
                placeholder="Rechercher un élève…"
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {studentQuery && !studentId && (
                <div className="max-h-32 overflow-y-auto border border-surface-100 rounded-lg">
                  {(students || []).slice(0, 6).map(s => (
                    <button key={s.id} onClick={() => { setStudentId(s.id); setStudentQuery(`${s.firstName} ${s.lastName}`) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50">{s.firstName} {s.lastName} · {s.className}</button>
                  ))}
                </div>
              )}
              {studentId && <p className="text-xs text-emerald-600">✓ Élève sélectionné</p>}
            </div>
          )}
          {scope === 'class' && (
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Choisir une classe —</option>
              {cl?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {scope === 'level' && (
            <select value={levelId} onChange={e => setLevelId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Choisir un niveau —</option>
              {cl?.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Type de frais</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                {FEE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Montant (GNF)</label>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Libellé</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex : Scolarité 2e trimestre"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Échéance (optionnel)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending} onClick={submit}>Créer</Button>
        </div>
      </div>
    </div>
  )
}

// ── Détail facturation d'un élève ─────────────────────────────
function StudentDetail({ student, onBack }) {
  const { data, isLoading } = useStudentInvoices(student.id)
  const [payInvoice, setPayInvoice] = useState(null)

  if (isLoading) return <div className="flex justify-center h-60 items-center"><Spinner /></div>

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="lg:hidden flex items-center gap-1 text-sm text-surface-500"><ArrowLeft size={16} /> Retour</button>
      <div className="flex items-center gap-3">
        <Avatar firstName={student.firstName} lastName={student.lastName} size="lg" />
        <div>
          <h3 className="font-semibold text-surface-900">{student.firstName} {student.lastName}</h3>
          <p className="text-sm text-surface-500">{student.className || 'Classe non définie'}</p>
        </div>
      </div>

      {/* Factures */}
      <div>
        <h4 className="text-sm font-semibold text-surface-700 mb-2">Factures</h4>
        <div className="space-y-2">
          {data.invoices.length === 0 ? (
            <p className="text-sm text-surface-500">Aucune facture.</p>
          ) : data.invoices.map(inv => {
            const st = STATUS[inv.status] || STATUS.pending
            return (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">{inv.label}</p>
                  <p className="text-xs text-surface-500">
                    {inv.typeLabel} · {formatGNF(inv.amountPaid)} / {formatGNF(inv.amountDue)}
                  </p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
                {inv.balance > 0 && (
                  <Button size="sm" icon={<Wallet size={14} />} onClick={() => setPayInvoice(inv)}>Encaisser</Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Historique paiements */}
      <div>
        <h4 className="text-sm font-semibold text-surface-700 mb-2">Paiements reçus</h4>
        {data.payments.length === 0 ? (
          <p className="text-sm text-surface-500">Aucun paiement.</p>
        ) : (
          <div className="space-y-2">
            {data.payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                <Receipt size={16} className="text-surface-400 shrink-0" />
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
      </div>

      {payInvoice && <PaymentModal invoice={payInvoice} onClose={() => setPayInvoice(null)} />}
    </div>
  )
}

export default function AccountantPayments() {
  const [q, setQ] = useState('')
  const [classId] = useState('')
  const { data: students, isLoading } = useFinanceStudents(q, classId)
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Paiements</h1>
          <p className="text-surface-500 mt-1">Recherchez un élève pour gérer ses factures</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setShowCreate(true)}>Créer une facture</Button>
      </div>

      <Card padding={false}>
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[420px]">
          {/* Liste élèves */}
          <div className={`border-r border-surface-100 flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-surface-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom de l'élève…"
                  className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[60vh]">
              {isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : students?.length === 0 ? (
                <p className="text-center text-surface-500 text-sm py-8">Aucun élève trouvé.</p>
              ) : students?.map(s => (
                <button key={s.id} onClick={() => setSelected(s)}
                  className={`w-full flex items-center gap-3 p-3 text-left border-b border-surface-50 hover:bg-surface-50 ${selected?.id === s.id ? 'bg-brand-50' : ''}`}>
                  <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-surface-500">{s.className || '—'}</p>
                  </div>
                  {s.balance > 0
                    ? <span className="text-xs font-semibold text-red-600 shrink-0">{formatGNF(s.balance)}</span>
                    : <Badge variant="success">À jour</Badge>}
                </button>
              ))}
            </div>
          </div>

          {/* Détail */}
          <div className={`lg:col-span-2 p-4 ${selected ? 'block' : 'hidden lg:block'}`}>
            {selected ? (
              <StudentDetail student={selected} onBack={() => setSelected(null)} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-surface-400 py-16">
                <FileText size={32} className="mb-2" />
                <p className="text-sm">Sélectionnez un élève</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

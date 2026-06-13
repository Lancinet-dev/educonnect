import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Pencil, Trash2, Receipt, Paperclip, FileUp, Wallet } from 'lucide-react'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { useUploadStatus, uploadDocument } from '@/hooks/useUpload'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'

const CATEGORIES = [
  { key: 'salaries', label: 'Salaires' }, { key: 'supplies', label: 'Fournitures' },
  { key: 'maintenance', label: 'Maintenance' }, { key: 'utilities', label: 'Électricité/Eau' },
  { key: 'transport', label: 'Transport' }, { key: 'other', label: 'Autre' },
]
const today = () => new Date().toISOString().slice(0, 10)
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function ExpenseModal({ initial, onClose }) {
  const isEdit = !!initial?.id
  const create = useCreateExpense()
  const update = useUpdateExpense()
  const { data: uploadStatus } = useUploadStatus()
  const [f, setF] = useState({
    category: initial?.category || 'supplies', label: initial?.label || '',
    amount: initial?.amount || '', date: initial ? String(initial.date).slice(0, 10) : today(),
    receiptUrl: initial?.receiptUrl || '',
  })
  const [uploading, setUploading] = useState(false)
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }))

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const r = await uploadDocument(file); setF(v => ({ ...v, receiptUrl: r.url })); toast.success('Justificatif ajouté') }
    catch (err) { toast.error(err?.response?.data?.error || "Échec de l'envoi.") }
    finally { setUploading(false); e.target.value = '' }
  }

  const save = async () => {
    if (!f.label.trim() || !f.amount) { toast.error('Libellé et montant requis.'); return }
    try {
      if (isEdit) { await update.mutateAsync({ id: initial.id, ...f, amount: parseFloat(f.amount) }); toast.success('Dépense modifiée') }
      else { await create.mutateAsync({ ...f, amount: parseFloat(f.amount) }); toast.success('Dépense enregistrée') }
      onClose()
    } catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">{isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={f.category} onChange={set('category')}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input type="number" value={f.amount} onChange={set('amount')} placeholder="Montant (GNF)"
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <input value={f.label} onChange={set('label')} placeholder="Libellé"
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="date" value={f.date} max={today()} onChange={set('date')}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {uploadStatus?.enabled && (
            f.receiptUrl ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-sm">
                <Paperclip size={15} className="text-emerald-600" />
                <a href={f.receiptUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-emerald-700 hover:underline">Justificatif joint</a>
                <button onClick={() => setF(v => ({ ...v, receiptUrl: '' }))} className="text-surface-400 hover:text-red-500"><X size={15} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-surface-300 text-surface-500 text-sm cursor-pointer hover:border-brand-300">
                <FileUp size={16} /> {uploading ? 'Envoi…' : 'Joindre un justificatif (optionnel)'}
                <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
              </label>
            )
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending || update.isPending} onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}

export default function AccountantExpenses() {
  const now = new Date()
  const [category, setCategory] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const filters = { ...(category && { category }), month, year }
  const { data: expenses, isLoading } = useExpenses(filters)
  const del = useDeleteExpense()
  const [modal, setModal] = useState(null)

  const total = (expenses || []).reduce((s, e) => s + e.amount, 0)

  const remove = async (e) => {
    if (!window.confirm('Supprimer cette dépense ?')) return
    try { await del.mutateAsync(e.id); toast.success('Dépense supprimée') } catch { toast.error('Échec.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Dépenses</h1>
          <p className="text-surface-500 mt-1">Total filtré : <span className="font-semibold text-surface-800">{formatGNF(total)}</span></p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setModal({})}>Nouvelle dépense</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          {[year + 1, year, year - 1, year - 2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : expenses?.length === 0 ? (
          <div className="text-center py-12">
            <Wallet size={32} className="text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">Aucune dépense sur cette période.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-50">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{e.label}</p>
                  <p className="text-xs text-surface-500">{new Date(e.date).toLocaleDateString('fr-FR')}
                    {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline ml-2">· justificatif</a>}
                  </p>
                </div>
                <Badge variant="default">{e.categoryLabel}</Badge>
                <span className="text-sm font-semibold text-red-600 w-28 text-right shrink-0">−{formatGNF(e.amount)}</span>
                <button onClick={() => setModal(e)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500"><Pencil size={15} /></button>
                <button onClick={() => remove(e)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && <ExpenseModal initial={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}

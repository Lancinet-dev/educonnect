import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Pencil, UserCheck, UserX } from 'lucide-react'
import {
  useMgmtStaff, useCreateStaff, useUpdateStaff, useToggleStaffActive,
} from '@/hooks/useManagement'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const ROLES = [
  { key: 'teacher', label: 'Enseignant' }, { key: 'accountant', label: 'Comptable' },
  { key: 'surveillant', label: 'Surveillant' }, { key: 'school_admin', label: 'Direction' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]))

function StaffModal({ initial, onClose }) {
  const isEdit = !!initial?.id
  const create = useCreateStaff()
  const update = useUpdateStaff()
  const [f, setF] = useState({
    firstName: initial?.firstName || '', lastName: initial?.lastName || '',
    role: initial?.role || 'teacher', email: initial?.email || '', phone: initial?.phone || '', gender: initial?.gender || '',
  })
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  const save = async () => {
    if (!f.firstName.trim() || !f.lastName.trim() || !f.email.trim()) { toast.error('Nom, prénom et email requis.'); return }
    try {
      if (isEdit) { await update.mutateAsync({ id: initial.id, ...f }); toast.success('Membre modifié') }
      else { const r = await create.mutateAsync(f); toast.success(r.defaultPassword ? `Créé · mot de passe : ${r.defaultPassword}` : 'Membre créé') }
      onClose()
    } catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">{isEdit ? 'Modifier le membre' : 'Nouveau membre du personnel'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={f.firstName} onChange={set('firstName')} placeholder="Prénom" className="input-mg" />
            <input value={f.lastName} onChange={set('lastName')} placeholder="Nom" className="input-mg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={f.role} onChange={set('role')} className="input-mg">
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select value={f.gender} onChange={set('gender')} className="input-mg">
              <option value="">Sexe</option><option value="M">Masculin</option><option value="F">Féminin</option>
            </select>
          </div>
          <input value={f.email} onChange={set('email')} placeholder="Email" className="input-mg w-full" />
          <input value={f.phone} onChange={set('phone')} placeholder="Téléphone (optionnel)" className="input-mg w-full" />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending || update.isPending} onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}

export default function DirectorStaff() {
  const { data: staff, isLoading } = useMgmtStaff()
  const toggle = useToggleStaffActive()
  const [modal, setModal] = useState(null)

  const onToggle = async (s) => {
    try { await toggle.mutateAsync({ id: s.id, isActive: !s.isActive }) }
    catch (e) { toast.error(e?.response?.data?.error || 'Action impossible.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{`.input-mg{padding:.5rem .75rem;border:1px solid #e4e4e7;border-radius:.5rem;font-size:.875rem;background:#fff}.input-mg:focus{outline:none;box-shadow:0 0 0 2px #a5b4fc}`}</style>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Personnel</h1>
          <p className="text-surface-500 mt-1">{staff?.length || 0} membre(s)</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setModal({})}>Nouveau membre</Button>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : staff?.length === 0 ? (
          <p className="text-center text-surface-500 text-sm py-12">Aucun membre.</p>
        ) : (
          <div className="divide-y divide-surface-50">
            {staff.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-3 ${!s.isActive ? 'opacity-50' : ''}`}>
                <Avatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-surface-500">{s.email}</p>
                </div>
                <Badge variant="default">{ROLE_LABEL[s.role] || s.role}</Badge>
                {!s.isActive && <Badge variant="danger">Inactif</Badge>}
                <button onClick={() => setModal(s)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500"><Pencil size={15} /></button>
                <button onClick={() => onToggle(s)} className={`p-2 rounded-lg hover:bg-surface-100 ${s.isActive ? 'text-red-500' : 'text-emerald-500'}`}>
                  {s.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && <StaffModal initial={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Search, UserCheck, UserX } from 'lucide-react'
import { useSuperAdminUsers, useToggleUserActive } from '@/hooks/useSuperAdminData'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const ROLE_LABEL = {
  super_admin: 'Super Admin', founder: 'Fondateur', school_admin: 'Directeur',
  accountant: 'Comptable', surveillant: 'Surveillant', teacher: 'Enseignant',
  student: 'Élève', parent: 'Parent',
}
const ROLES = ['founder', 'school_admin', 'accountant', 'surveillant', 'teacher', 'student', 'parent']

export default function SuperAdminUsers() {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const { data: users, isLoading } = useSuperAdminUsers({ ...(q && { q }), ...(role && { role }) })
  const toggle = useToggleUserActive()

  const onToggle = async (u) => {
    try { await toggle.mutateAsync({ id: u.id, isActive: !u.isActive }); toast.success(u.isActive ? 'Compte désactivé' : 'Compte réactivé') }
    catch (e) { toast.error(e?.response?.data?.error || 'Action impossible.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Utilisateurs</h1>
        <p className="text-surface-500 mt-1">Recherche sur toute la plateforme</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom ou email…"
            className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : users?.length === 0 ? (
          <p className="text-center text-surface-500 text-sm py-12">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="divide-y divide-surface-50">
            {users.map(u => (
              <div key={u.id} className={`flex items-center gap-3 p-3 ${!u.isActive ? 'opacity-50' : ''}`}>
                <Avatar firstName={u.firstName} lastName={u.lastName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-surface-500 truncate">{u.email || '—'}{u.schoolName ? ` · ${u.schoolName}` : ''}</p>
                </div>
                <Badge variant="default">{ROLE_LABEL[u.role] || u.role}</Badge>
                {!u.isActive && <Badge variant="danger">Désactivé</Badge>}
                <button onClick={() => onToggle(u)} title={u.isActive ? 'Désactiver' : 'Réactiver'}
                  className={`p-2 rounded-lg hover:bg-surface-100 ${u.isActive ? 'text-red-500' : 'text-emerald-500'}`}>
                  {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      {users && <p className="text-xs text-surface-400 text-center">{users.length} résultat(s) · limité à 100</p>}
    </div>
  )
}

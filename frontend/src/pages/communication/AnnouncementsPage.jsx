import { useState } from 'react'
import { Megaphone, Plus, X, AlertTriangle, Info, Bell } from 'lucide-react'
import { useAnnouncements, useCreateAnnouncement, useMarkAnnouncementRead } from '@/hooks/useAnnouncements'
import { useAttendanceClasses } from '@/hooks/useAttendance'
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const PRIORITY = {
  urgent:    { label: 'Urgent',    badge: 'danger',  icon: AlertTriangle, card: 'border-red-200 bg-red-50' },
  important: { label: 'Important', badge: 'warning', icon: Bell,          card: 'border-amber-200 bg-amber-50' },
  normal:    { label: 'Info',      badge: 'info',    icon: Info,          card: 'border-surface-200 bg-white' },
}
const TARGET_LABEL = {
  school: "Toute l'école", teachers: 'Enseignants', parents: 'Parents', students: 'Élèves', class: 'Une classe',
}
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// ── Formulaire de création ────────────────────────────────────
function CreateForm({ onClose }) {
  const create = useCreateAnnouncement()
  const { data: classes } = useAttendanceClasses()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('school')
  const [targetClassId, setTargetClassId] = useState('')
  const [priority, setPriority] = useState('normal')

  const submit = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Titre et contenu requis.'); return }
    if (target === 'class' && !targetClassId) { toast.error('Choisissez une classe.'); return }
    try {
      await create.mutateAsync({ title: title.trim(), body: body.trim(), target, targetClassId: target === 'class' ? targetClassId : null, priority })
      toast.success('Annonce publiée')
      onClose()
    } catch { toast.error('Échec de la publication.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Nouvelle annonce</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'annonce"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Contenu</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Votre message…"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Destinataires</label>
              <select value={target} onChange={e => setTarget(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(TARGET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Priorité</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="normal">Normale</option>
                <option value="important">Importante</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          {target === 'class' && (
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Classe</label>
              <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">— Choisir —</option>
                {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending} onClick={submit}>Publier</Button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const { data, isLoading, error } = useAnnouncements()
  const markRead = useMarkAnnouncementRead()
  const { role } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const canCreate = ['school_admin', 'teacher', 'super_admin'].includes(role)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Annonces</h1>
          <p className="text-surface-500 mt-1">Informations officielles de l'école</p>
        </div>
        {canCreate && <Button size="lg" icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle annonce</Button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center h-60 items-center"><Spinner /></div>
      ) : error ? (
        <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>
      ) : data.announcements.length === 0 ? (
        <Card className="text-center py-12">
          <Megaphone size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">Aucune annonce pour le moment</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.announcements.map(a => {
            const p = PRIORITY[a.priority] || PRIORITY.normal
            const Icon = p.icon
            return (
              <Card key={a.id} className={`${p.card} ${!a.isRead ? 'ring-1 ring-brand-200' : ''}`}
                onClick={() => !a.isRead && markRead.mutate(a.id)}
                hover={!a.isRead}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center shrink-0">
                    <Icon size={20} className={a.priority === 'urgent' ? 'text-red-600' : a.priority === 'important' ? 'text-amber-600' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-surface-900">{a.title}</h3>
                      <Badge variant={p.badge}>{p.label}</Badge>
                      {!a.isRead && <Badge variant="primary" dot>Nouveau</Badge>}
                    </div>
                    <p className="text-sm text-surface-700 mt-1.5 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-surface-500 mt-2">
                      {a.author ? `${a.author} · ` : ''}{TARGET_LABEL[a.target] || a.target} · {fmtDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showForm && <CreateForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, ClipboardList, GraduationCap, Paperclip } from 'lucide-react'
import { useParentHomework } from '@/hooks/useHomework'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

export default function ParentHomework() {
  const { data, isLoading, error } = useParentHomework()
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
        <h1 className="text-2xl font-bold font-display text-surface-900">Devoirs</h1>
        <p className="text-surface-500 mt-1">Suivi des devoirs de vos enfants</p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => (
            <button key={c.id} onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl border transition-all ${
                i === activeIdx ? 'bg-brand-50 border-brand-300 shadow-sm' : 'bg-white border-surface-200 hover:border-surface-300'}`}>
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="sm" />
              <div className="text-left">
                <p className={`text-sm font-semibold leading-tight ${i === activeIdx ? 'text-brand-700' : 'text-surface-800'}`}>{c.firstName} {c.lastName}</p>
                <p className="text-[11px] text-surface-500">{c.className || 'Classe non définie'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-surface-200 bg-white p-5 flex items-center gap-3">
          <ClipboardList size={28} className="text-brand-600" />
          <div>
            <p className="text-2xl font-bold text-surface-900">{child.pendingCount}</p>
            <p className="text-xs text-surface-500">Devoir(s) en cours</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 flex items-center gap-3 ${child.overdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-surface-200 bg-white'}`}>
          <AlertTriangle size={28} className={child.overdueCount > 0 ? 'text-red-600' : 'text-surface-300'} />
          <div>
            <p className={`text-2xl font-bold ${child.overdueCount > 0 ? 'text-red-700' : 'text-surface-900'}`}>{child.overdueCount}</p>
            <p className="text-xs text-surface-500">En retard</p>
          </div>
        </div>
      </div>

      {/* Détail */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-3">Tous les devoirs</h3>
        {child.homework.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">Aucun devoir.</p>
        ) : (
          <div className="space-y-2">
            {child.homework.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-100">
                {h.done
                  ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  : <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: h.color || '#6366f1' }} />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${h.done ? 'text-surface-400 line-through' : 'text-surface-900'}`}>{h.title}</p>
                  <p className="text-xs text-surface-500">
                    {h.subject || 'Sans matière'} · à rendre le {fmt(h.dueDate)}
                    {h.attachmentUrl && (
                      <a href={h.attachmentUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-1 ml-2">
                        <Paperclip size={11} /> Pièce jointe
                      </a>
                    )}
                  </p>
                </div>
                {h.done
                  ? <Badge variant="success">Fait</Badge>
                  : h.overdue
                    ? <Badge variant="danger">En retard</Badge>
                    : <Badge variant="info">À faire</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

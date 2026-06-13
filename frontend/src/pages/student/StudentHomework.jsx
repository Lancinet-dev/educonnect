import toast from 'react-hot-toast'
import { CheckCircle2, Circle, ClipboardList, AlertTriangle, Paperclip } from 'lucide-react'
import { useStudentHomework, useToggleHomeworkDone } from '@/hooks/useHomework'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function HomeworkItem({ hw, onToggle, busy }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-surface-200">
      <button onClick={() => onToggle(hw)} disabled={busy} className="mt-0.5 shrink-0">
        {hw.done
          ? <CheckCircle2 size={22} className="text-emerald-500" />
          : <Circle size={22} className="text-surface-300 hover:text-brand-500" />}
      </button>
      <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: hw.color || '#2563eb' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-medium ${hw.done ? 'text-surface-400 line-through' : 'text-surface-900'}`}>{hw.title}</p>
          {hw.subject && <Badge variant="default">{hw.subject}</Badge>}
          {hw.overdue && <Badge variant="danger"><AlertTriangle size={12} /> En retard</Badge>}
        </div>
        {hw.description && <p className="text-sm text-surface-600 mt-1">{hw.description}</p>}
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-surface-500">À rendre le {fmt(hw.dueDate)}</p>
          {hw.attachmentUrl && (
            <a href={hw.attachmentUrl} target="_blank" rel="noreferrer"
              className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <Paperclip size={12} /> Pièce jointe
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentHomework() {
  const { data, isLoading, error } = useStudentHomework()
  const toggle = useToggleHomeworkDone()

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  const onToggle = async (hw) => {
    try { await toggle.mutateAsync({ id: hw.id, done: !hw.done }) }
    catch { toast.error('Action impossible.') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Mes devoirs</h1>
        <p className="text-surface-500 mt-1">Cochez un devoir une fois terminé</p>
      </div>

      {/* À faire */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-3">À faire ({data.todo.length})</h3>
        {data.todo.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList size={28} className="text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">Aucun devoir à faire 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.todo.map(hw => <HomeworkItem key={hw.id} hw={hw} onToggle={onToggle} busy={toggle.isPending} />)}
          </div>
        )}
      </Card>

      {/* Terminés */}
      {data.done.length > 0 && (
        <Card>
          <h3 className="font-semibold text-surface-900 mb-3">Devoirs terminés ({data.done.length})</h3>
          <div className="space-y-2">
            {data.done.map(hw => <HomeworkItem key={hw.id} hw={hw} onToggle={onToggle} busy={toggle.isPending} />)}
          </div>
        </Card>
      )}
    </div>
  )
}

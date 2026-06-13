import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, ClipboardCheck } from 'lucide-react'
import { useTeacherOverview } from '@/hooks/useTeacherData'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function TeacherClasses() {
  const { data, isLoading, error } = useTeacherOverview()
  const navigate = useNavigate()

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Mes classes</h1>
        <p className="text-surface-500 mt-1">{data.classes.length} classe(s) · {data.counts.students} élèves</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.classes.map(c => (
          <Card key={c.id} hover>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <BookOpen size={22} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-surface-900">{c.name}</p>
                  <p className="text-xs text-surface-500">{c.level || ''}{c.room ? ` · ${c.room}` : ''}</p>
                </div>
              </div>
              {c.isMain && <Badge variant="primary">Principal</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-100">
              <span className="text-sm text-surface-600 flex items-center gap-2">
                <Users size={16} className="text-surface-400" />
                <span className="font-semibold text-surface-900">{c.students}</span> élève{c.students > 1 ? 's' : ''}
              </span>
              <Button variant="secondary" size="sm" icon={<ClipboardCheck size={15} />}
                onClick={() => navigate(`/teacher/presences?classId=${c.id}`)}>Appel</Button>
            </div>
          </Card>
        ))}
        {data.classes.length === 0 && <p className="text-surface-500 text-sm">Aucune classe affectée.</p>}
      </div>
    </div>
  )
}

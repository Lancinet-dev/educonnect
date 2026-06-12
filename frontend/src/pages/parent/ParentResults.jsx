import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useParentResults } from '@/hooks/useGrades'
import { ResultsView } from '@/pages/student/StudentGrades'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'

export default function ParentResults() {
  const { data, isLoading, error } = useParentResults()
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
        <h1 className="text-2xl font-bold font-display text-surface-900">Résultats</h1>
        <p className="text-surface-500 mt-1">Bulletins et moyennes de vos enfants</p>
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

      <ResultsView results={child} studentId={child.id} fullName={`${child.firstName} ${child.lastName}`} />
    </div>
  )
}

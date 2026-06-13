import { Award, Download, BookOpen, Medal } from 'lucide-react'
import { useMyResults, downloadBulletin } from '@/hooks/useGrades'
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

const TYPE_LABEL = { devoir: 'Devoir', interrogation: 'Interrogation', composition: 'Composition' }

// Composant partagé (réutilisé côté Parent)
export function ResultsView({ results, studentId, fullName }) {
  if (!results.hasGrades) {
    return (
      <Card className="text-center py-12">
        <BookOpen size={40} className="text-surface-300 mx-auto mb-3" />
        <p className="text-surface-600 font-medium">Pas encore de notes disponibles</p>
        <p className="text-surface-400 text-sm mt-1">Les notes apparaîtront ici dès que les enseignants les auront saisies.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 flex flex-col items-center justify-center text-center">
          <Award size={36} className="text-brand-600" />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-2">Moyenne générale</p>
          <p className="text-3xl font-bold text-brand-700 mt-0.5">{results.generalAverage}/20</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 flex flex-col items-center justify-center text-center">
          <Medal size={36} className="text-violet-600" />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-2">Rang dans la classe</p>
          <p className="text-3xl font-bold text-violet-700 mt-0.5">
            {results.rank != null ? `${results.rank}${results.rank === 1 ? 'er' : 'e'}` : '—'}
          </p>
          <p className="text-[11px] text-surface-500">sur {results.classSize} élèves</p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-white p-5 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-sm text-surface-500">{results.className}</p>
          <Button icon={<Download size={16} />} onClick={() => downloadBulletin(studentId, fullName)}>
            Télécharger le bulletin
          </Button>
        </div>
      </div>

      {/* Détail par matière */}
      <div className="space-y-3">
        {results.subjects.map((s) => (
          <Card key={s.subjectId}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color || '#2563eb' }} />
                <h3 className="font-semibold text-surface-900">{s.subject}</h3>
                <Badge variant="default">coef {s.coefficient}</Badge>
              </div>
              <span className="text-lg font-bold text-surface-900">
                {s.average != null ? `${s.average}/20` : '—'}
              </span>
            </div>
            <div className="divide-y divide-surface-100">
              {s.grades.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-surface-800">{g.label}</p>
                    <p className="text-xs text-surface-500">
                      {TYPE_LABEL[g.type] || g.type} · coef {g.coefficient} · {new Date(g.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-surface-900">{g.value}/{g.maxValue}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function StudentGrades() {
  const { data: results, isLoading, error } = useMyResults()
  const { user, fullName } = useAuth()

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Mes notes</h1>
        <p className="text-surface-500 mt-1">Résultats du 1er trimestre</p>
      </div>
      <ResultsView results={results} studentId={user?.id} fullName={fullName} />
    </div>
  )
}

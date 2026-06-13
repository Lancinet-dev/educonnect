import { useMyWeek } from '@/hooks/useTimetable'
import TimetableGrid from '@/components/TimetableGrid'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

export default function StudentTimetable() {
  const { data: slots, isLoading, error } = useMyWeek()

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>
  if (error) return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement.</p></Card>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Mon emploi du temps</h1>
        <p className="text-surface-500 mt-1">Semaine complète</p>
      </div>
      <Card padding={false} className="p-3">
        {slots && slots.length > 0
          ? <TimetableGrid slots={slots} mode="view-class" />
          : <p className="text-center text-surface-500 text-sm py-10">Emploi du temps non disponible.</p>}
      </Card>
    </div>
  )
}

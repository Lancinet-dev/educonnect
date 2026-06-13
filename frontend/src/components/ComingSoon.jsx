import { Hammer } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function ComingSoon({ title = 'Module', note }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold font-display text-surface-900 mb-4">{title}</h1>
      <Card className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
          <Hammer size={26} className="text-amber-500" />
        </div>
        <p className="text-surface-700 font-medium">Bientôt disponible</p>
        <p className="text-surface-400 text-sm mt-1">{note || 'Ce module est en cours de préparation.'}</p>
      </Card>
    </div>
  )
}

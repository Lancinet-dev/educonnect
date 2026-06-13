import { Plus } from 'lucide-react'

export const DAYS = [
  { n: 1, label: 'Lundi' }, { n: 2, label: 'Mardi' }, { n: 3, label: 'Mercredi' },
  { n: 4, label: 'Jeudi' }, { n: 5, label: 'Vendredi' }, { n: 6, label: 'Samedi' },
]
export const DEFAULT_PERIODS = [
  { start: '08:00', end: '09:00' }, { start: '09:00', end: '10:00' },
  { start: '10:15', end: '11:15' }, { start: '11:15', end: '12:15' },
  { start: '14:00', end: '15:00' }, { start: '15:00', end: '16:00' },
]

// Construit les lignes horaires à partir des périodes par défaut + créneaux réels
function buildRows(slots) {
  const map = new Map()
  DEFAULT_PERIODS.forEach(p => map.set(p.start, { ...p }))
  slots.forEach(s => { if (!map.has(s.startTime)) map.set(s.startTime, { start: s.startTime, end: s.endTime }) })
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
}

// Grille hebdomadaire. `mode` = 'edit' (directeur) | 'view-teacher' | 'view-class'
export default function TimetableGrid({ slots = [], mode = 'view-class', onCellClick, onSlotClick }) {
  const rows = buildRows(slots)
  const byCell = {}
  slots.forEach(s => { byCell[`${s.dayOfWeek}-${s.startTime}`] = s })
  const editable = mode === 'edit'
  const secondary = (s) => mode === 'view-teacher' ? s.className : (s.teacherName || '')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[680px]">
        <thead>
          <tr>
            <th className="w-20 p-2 text-xs font-medium text-surface-400"></th>
            {DAYS.map(d => (
              <th key={d.n} className="p-2 text-sm font-semibold text-surface-700 border-b border-surface-200">{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.start}>
              <td className="p-2 text-[11px] text-surface-500 align-top whitespace-nowrap border-r border-surface-100">
                {p.start}<br /><span className="text-surface-300">{p.end}</span>
              </td>
              {DAYS.map(d => {
                const slot = byCell[`${d.n}-${p.start}`]
                if (slot) {
                  return (
                    <td key={d.n} className="p-1 align-top">
                      <button
                        onClick={() => (editable ? onSlotClick?.(slot) : null)}
                        className={`w-full text-left rounded-lg p-2 border-l-4 ${editable ? 'hover:ring-2 hover:ring-brand-200 cursor-pointer' : 'cursor-default'}`}
                        style={{ borderColor: slot.color || '#6366f1', background: (slot.color || '#6366f1') + '14' }}>
                        <p className="text-xs font-semibold text-surface-900 leading-tight">{slot.subject || 'Cours'}</p>
                        {secondary(slot) && <p className="text-[10px] text-surface-500 mt-0.5 truncate">{secondary(slot)}</p>}
                        {slot.room && <p className="text-[10px] text-surface-400">{slot.room}</p>}
                      </button>
                    </td>
                  )
                }
                return (
                  <td key={d.n} className="p-1 align-top">
                    {editable ? (
                      <button onClick={() => onCellClick?.(d.n, p)}
                        className="w-full h-[58px] rounded-lg border border-dashed border-surface-200 text-surface-300
                                   hover:border-brand-300 hover:text-brand-400 flex items-center justify-center transition-colors">
                        <Plus size={16} />
                      </button>
                    ) : <div className="h-[58px]" />}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

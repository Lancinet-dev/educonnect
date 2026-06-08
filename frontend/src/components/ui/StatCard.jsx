import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, color = 'brand', className = '' }) {
  const colorMap = {
    brand:   { bg: 'bg-brand-50',   icon: 'text-brand-600',   text: 'text-brand-700' },
    green:   { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   text: 'text-amber-700' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-600',     text: 'text-red-700' },
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    text: 'text-blue-700' },
    purple:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  text: 'text-violet-700' },
  }
  const c = colorMap[color] || colorMap.brand

  return (
    <div className={clsx('bg-white rounded-xl border border-surface-200 shadow-sm p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-surface-900 font-display">{value}</p>
          {trend !== undefined && (
            <div className={clsx(
              'flex items-center gap-1 mt-1.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-surface-500'
            )}>
              {trend > 0 ? <TrendingUp size={13} /> : trend < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
              {trendLabel || `${trend > 0 ? '+' : ''}${trend}%`}
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  )
}

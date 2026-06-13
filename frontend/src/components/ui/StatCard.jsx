import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber'

const colorMap = {
  brand:  { grad: 'from-brand-500 to-secondary-600',     spark: '#2563eb' },
  green:  { grad: 'from-emerald-500 to-emerald-600',     spark: '#10b981' },
  amber:  { grad: 'from-amber-400 to-amber-500',         spark: '#f59e0b' },
  red:    { grad: 'from-red-500 to-red-600',             spark: '#ef4444' },
  blue:   { grad: 'from-sky-500 to-blue-600',            spark: '#3b82f6' },
  purple: { grad: 'from-violet-500 to-secondary-600',    spark: '#7c3aed' },
}

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, color = 'brand', data, className = '' }) {
  const c = colorMap[color] || colorMap.brand
  const isNumber = typeof value === 'number'
  const sparkData = data?.length ? data.map((v, i) => ({ i, v })) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={clsx('relative bg-white rounded-2xl border border-surface-100 shadow-card p-5 overflow-hidden hover:shadow-glow transition-shadow', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-surface-900 font-display font-tabular truncate">
            {isNumber ? <AnimatedNumber value={value} /> : value}
          </p>
          {trend !== undefined && (
            <div className={clsx('inline-flex items-center gap-1 mt-2 text-xs font-semibold px-1.5 py-0.5 rounded-md',
              trend > 0 ? 'text-emerald-700 bg-emerald-50' : trend < 0 ? 'text-red-700 bg-red-50' : 'text-surface-500 bg-surface-100')}>
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {trendLabel || `${trend > 0 ? '+' : ''}${trend}%`}
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', c.grad)}>
            <Icon size={20} className="text-white" />
          </div>
        )}
      </div>

      {sparkData && (
        <div className="h-9 -mx-1 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.spark} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={c.spark} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={c.spark} strokeWidth={2} fill={`url(#sp-${color})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

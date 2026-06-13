import { useState } from 'react'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function Input({
  label, error, hint, success, icon: Icon,
  iconRight: IconRight, className = '', ...props
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = props.value != null && props.value !== ''
  const floated = focused || hasValue

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {Icon && (
          <div className={clsx('absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors',
            focused ? 'text-brand-600' : error ? 'text-red-400' : 'text-surface-400')}>
            <Icon size={16} />
          </div>
        )}
        {label && (
          <motion.label
            initial={false}
            animate={floated ? { top: 6, fontSize: '0.6875rem' } : { top: 13, fontSize: '0.875rem' }}
            className={clsx('absolute pointer-events-none font-medium z-10',
              Icon ? 'left-9' : 'left-3',
              focused ? 'text-brand-600' : error ? 'text-red-500' : 'text-surface-400')}>
            {label}{props.required && <span className="text-red-500 ml-0.5">*</span>}
          </motion.label>
        )}
        <input
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          className={clsx(
            'w-full bg-white border rounded-xl text-sm text-surface-900 transition-all duration-150',
            'placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            label ? 'pt-5 pb-1.5' : 'py-2.5',
            Icon ? 'pl-9' : 'pl-3',
            (IconRight || success) ? 'pr-9' : 'pr-3',
            error ? 'border-red-400 focus:ring-red-400' : 'border-surface-200 hover:border-surface-300',
            className
          )}
          {...props}
        />
        {success && !error && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={11} className="text-white" />
          </motion.div>
        )}
        {IconRight && !success && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400"><IconRight size={16} /></div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs text-red-600 flex items-center gap-1">⚠ {error}</motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  )
}

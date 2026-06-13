import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-gradient-to-r from-brand-600 to-secondary-600 text-white shadow-sm hover:shadow-glow-btn border border-brand-700/20',
  secondary: 'bg-white hover:bg-surface-50 text-surface-700 border border-surface-200 shadow-xs',
  ghost:     'bg-transparent hover:bg-brand-50 text-surface-600 hover:text-brand-700 border border-transparent',
  danger:    'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-700/20',
  success:   'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm border border-emerald-700/20',
}
const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1 min-h-[28px]',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5 min-h-[34px]',
  md: 'px-4 py-2 text-sm rounded-xl gap-2 min-h-[40px]',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2 min-h-[44px]',
  xl: 'px-6 py-3 text-base rounded-2xl gap-2.5 min-h-[48px]',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight,
  className = '', ...props
}) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : icon}
      {children}
      {!loading && iconRight}
    </motion.button>
  )
}

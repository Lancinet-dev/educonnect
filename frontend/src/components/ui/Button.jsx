import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-xs border border-brand-700',
  secondary: 'bg-white hover:bg-surface-50 active:bg-surface-100 text-surface-700 border border-surface-200 shadow-xs',
  ghost:     'bg-transparent hover:bg-surface-100 active:bg-surface-200 text-surface-600 border border-transparent',
  danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs border border-red-700',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-700',
}
const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
  xl: 'px-6 py-3 text-base rounded-xl gap-2.5',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight,
  className = '', ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
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
    </button>
  )
}

import { clsx } from 'clsx'

const variants = {
  default:  'bg-surface-100 text-surface-700',
  primary:  'bg-brand-100 text-brand-700',
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  info:     'bg-blue-100 text-blue-700',
  purple:   'bg-violet-100 text-violet-700',
}

export default function Badge({ children, variant = 'default', dot = false, className = '' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5',
      'rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {dot && (
        <span className="relative flex w-1.5 h-1.5">
          <span className={clsx('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
            variant === 'success' ? 'bg-emerald-500' :
            variant === 'warning' ? 'bg-amber-500' :
            variant === 'danger'  ? 'bg-red-500' :
            variant === 'info'    ? 'bg-blue-500' : 'bg-surface-500')} />
          <span className={clsx('relative inline-flex rounded-full w-1.5 h-1.5',
            variant === 'success' ? 'bg-emerald-500' :
            variant === 'warning' ? 'bg-amber-500' :
            variant === 'danger'  ? 'bg-red-500' :
            variant === 'info'    ? 'bg-blue-500' : 'bg-surface-500')} />
        </span>
      )}
      {children}
    </span>
  )
}

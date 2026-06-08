import { clsx } from 'clsx'

export default function Input({
  label, error, hint, icon: Icon,
  iconRight: IconRight, className = '', ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            <Icon size={16} />
          </div>
        )}
        <input
          className={clsx(
            'w-full py-2 bg-white border rounded-lg text-sm text-surface-900',
            'placeholder:text-surface-400 shadow-inner transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            Icon ? 'pl-9 pr-3' : 'px-3',
            IconRight ? 'pr-9' : '',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-surface-200 hover:border-surface-300',
            className
          )}
          {...props}
        />
        {IconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
            <IconRight size={16} />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  )
}

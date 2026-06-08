import { clsx } from 'clsx'

export default function Card({ children, className = '', padding = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-surface-200 shadow-sm',
        padding && 'p-5',
        hover && 'hover:shadow-md hover:border-surface-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

import { clsx } from 'clsx'

// Palette de couleurs pour les initiales
const colors = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
]

function getColor(name = '') {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[code % colors.length]
}

function getInitials(firstName = '', lastName = '') {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
}

const sizes = {
  xs:  'w-6 h-6 text-2xs',
  sm:  'w-8 h-8 text-xs',
  md:  'w-9 h-9 text-sm',
  lg:  'w-11 h-11 text-base',
  xl:  'w-14 h-14 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
}

export default function Avatar({ firstName, lastName, src, size = 'md', className = '' }) {
  const initials = getInitials(firstName, lastName)
  const colorClass = getColor(`${firstName}${lastName}`)

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden',
      sizes[size],
      !src && colorClass,
      className
    )}>
      {src
        ? <img src={src} alt={initials} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </div>
  )
}

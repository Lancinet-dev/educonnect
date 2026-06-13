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

const ROLE_RING = {
  school_admin: 'ring-blue-400', founder: 'ring-violet-400', teacher: 'ring-emerald-400',
  student: 'ring-sky-400', parent: 'ring-amber-400', accountant: 'ring-teal-400',
  surveillant: 'ring-rose-400', super_admin: 'ring-indigo-400',
}

export default function Avatar({ firstName, lastName, src, size = 'md', role, className = '' }) {
  const initials = getInitials(firstName, lastName)
  const colorClass = getColor(`${firstName}${lastName}`)

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden',
      sizes[size],
      !src && colorClass,
      role && `ring-2 ring-offset-2 ring-offset-white ${ROLE_RING[role] || 'ring-surface-300'}`,
      className
    )}>
      {src
        ? <img src={src} alt={initials} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </div>
  )
}

// Groupe d'avatars qui se chevauchent
export function AvatarGroup({ people = [], max = 4, size = 'sm' }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">
          <Avatar firstName={p.firstName} lastName={p.lastName} src={p.avatarUrl} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div className={clsx('rounded-full ring-2 ring-white bg-surface-100 text-surface-600 flex items-center justify-center font-semibold', sizes[size])}>
          +{extra}
        </div>
      )}
    </div>
  )
}

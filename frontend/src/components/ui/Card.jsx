import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export default function Card({ children, className = '', padding = true, hover = false, glass = false, ...props }) {
  const base = clsx(
    'rounded-2xl transition-shadow duration-200',
    glass
      ? 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-card'
      : 'bg-white border border-surface-100 shadow-card',
    padding && 'p-5',
    className
  )

  if (hover) {
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
        className={clsx(base, 'hover:shadow-premium cursor-pointer')} {...props}>
        {children}
      </motion.div>
    )
  }
  return <div className={base} {...props}>{children}</div>
}

import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

// État vide soigné et cohérent : icône + titre + sous-texte (+ action optionnelle)
export default function EmptyState({ icon: Icon = Inbox, title, subtitle, action, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-400/30 to-secondary-500/20 blur-2xl rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl bg-white border border-surface-100 shadow-card flex items-center justify-center">
          <Icon size={28} className="text-brand-500" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-surface-700 font-medium">{title}</p>
      {subtitle && <p className="text-surface-400 text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

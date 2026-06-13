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
      <div className="w-16 h-16 rounded-2xl bg-surface-50 border border-surface-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-surface-300" strokeWidth={1.75} />
      </div>
      <p className="text-surface-700 font-medium">{title}</p>
      {subtitle && <p className="text-surface-400 text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

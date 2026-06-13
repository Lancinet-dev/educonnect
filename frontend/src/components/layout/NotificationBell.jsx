import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, MessageSquare, Megaphone, ClipboardList } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

const ROLE_BASE = {
  school_admin: '/director', teacher: '/teacher', parent: '/parent',
  student: '/student', founder: '/founder', accountant: '/accountant', super_admin: '/superadmin',
}
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ role }) {
  const { data } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const base = ROLE_BASE[role] || ''

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const count = data?.unreadCount || 0
  const items = data?.items || []

  const goTo = (item) => {
    setOpen(false)
    if (item.type === 'message') navigate(`${base}/messages?c=${item.conversationId}`)
    else if (item.type === 'homework') navigate(`${base}/devoirs`)
    else navigate(`${base}/annonces`)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative text-surface-500 hover:text-surface-700 transition-colors">
        <Bell size={20} />
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px]
                         font-bold rounded-full flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'top right' }}
          className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-surface-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="font-semibold text-surface-900 text-sm">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-center text-surface-500 text-sm py-8">Aucune notification</p>
            ) : items.map((item, i) => (
              <button key={i} onClick={() => goTo(item)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-surface-50 border-b border-surface-50 ${
                  !item.read ? 'bg-brand-50/40' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  item.type === 'message' ? 'bg-blue-50 text-blue-600'
                    : item.type === 'homework' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                  {item.type === 'message' ? <MessageSquare size={16} />
                    : item.type === 'homework' ? <ClipboardList size={16} /> : <Megaphone size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{item.title}</p>
                  <p className="text-xs text-surface-500 truncate">{item.body}</p>
                  <p className="text-[10px] text-surface-400 mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>
                {!item.read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}

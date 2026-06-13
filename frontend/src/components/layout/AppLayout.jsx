import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  MessageSquare, CreditCard, BarChart3, Settings,
  LogOut, Menu, X, GraduationCap, Megaphone, CalendarDays, ShieldAlert,
  Search, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { connectSocket, disconnectSocket } from '@/services/socket'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import NotificationBell from './NotificationBell'
import AvatarUploader from '@/components/AvatarUploader'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useUploadStatus } from '@/hooks/useUpload'
import { clsx } from 'clsx'

const MENUS = {
  parent: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/parent' },
    { label: 'Résultats',       icon: BookOpen,         path: '/parent/resultats' },
    { label: 'Présences',       icon: ClipboardList,    path: '/parent/presences' },
    { label: 'Devoirs',         icon: ClipboardList,    path: '/parent/devoirs' },
    { label: 'Paiements',       icon: CreditCard,       path: '/parent/paiements' },
    { label: 'Messages',        icon: MessageSquare,    path: '/parent/messages' },
    { label: 'Annonces',        icon: Megaphone,        path: '/parent/annonces' },
  ],
  student: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/student' },
    { label: 'Notes',           icon: BookOpen,         path: '/student/notes' },
    { label: 'Devoirs',         icon: ClipboardList,    path: '/student/devoirs' },
    { label: 'Emploi du temps', icon: CalendarDays,     path: '/student/emploi-du-temps' },
    { label: 'Messages',        icon: MessageSquare,    path: '/student/messages' },
    { label: 'Annonces',        icon: Megaphone,        path: '/student/annonces' },
  ],
  teacher: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/teacher' },
    { label: 'Mes classes',     icon: Users,            path: '/teacher/classes' },
    { label: 'Présences',       icon: ClipboardList,    path: '/teacher/presences' },
    { label: 'Notes',           icon: BookOpen,         path: '/teacher/notes' },
    { label: 'Devoirs',         icon: ClipboardList,    path: '/teacher/devoirs' },
    { label: 'Messages',        icon: MessageSquare,    path: '/teacher/messages' },
    { label: 'Annonces',        icon: Megaphone,        path: '/teacher/annonces' },
  ],
  school_admin: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/director' },
    { label: 'Élèves',          icon: Users,            path: '/director/eleves' },
    { label: 'Personnel',       icon: Users,            path: '/director/personnel' },
    { label: 'Classes',         icon: BookOpen,         path: '/director/classes' },
    { label: 'Emploi du temps', icon: CalendarDays,     path: '/director/emploi-du-temps' },
    { label: 'Présences',       icon: ClipboardList,    path: '/director/presences' },
    { label: 'Discipline',      icon: ShieldAlert,      path: '/director/discipline' },
    { label: 'Finances',        icon: CreditCard,       path: '/director/finances' },
    { label: 'Messages',        icon: MessageSquare,    path: '/director/messages' },
    { label: 'Annonces',        icon: Megaphone,        path: '/director/annonces' },
    { label: 'Rapports',        icon: BarChart3,        path: '/director/rapports' },
  ],
  accountant: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/accountant' },
    { label: 'Paiements',       icon: CreditCard,       path: '/accountant/paiements' },
    { label: 'Dépenses',        icon: CreditCard,       path: '/accountant/depenses' },
    { label: 'Rapports',        icon: BarChart3,        path: '/accountant/rapports' },
  ],
  surveillant: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/surveillant' },
    { label: 'Présences',       icon: ClipboardList,    path: '/surveillant/presences' },
    { label: 'Discipline',      icon: ShieldAlert,      path: '/surveillant/discipline' },
    { label: 'Messages',        icon: MessageSquare,    path: '/surveillant/messages' },
  ],
  founder: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/founder' },
    { label: 'Mes écoles',      icon: GraduationCap,   path: '/founder/ecoles' },
    { label: 'Finances',        icon: CreditCard,       path: '/founder/finances' },
    { label: 'Rapports',        icon: BarChart3,        path: '/founder/rapports' },
    { label: 'Messages',        icon: MessageSquare,    path: '/founder/messages' },
    { label: 'Annonces',        icon: Megaphone,        path: '/founder/annonces' },
  ],
  super_admin: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/superadmin' },
    { label: 'Écoles',          icon: GraduationCap,   path: '/superadmin/ecoles' },
    { label: 'Utilisateurs',    icon: Users,            path: '/superadmin/utilisateurs' },
    { label: 'Abonnements',     icon: CreditCard,       path: '/superadmin/abonnements' },
    { label: 'Statistiques',    icon: BarChart3,        path: '/superadmin/statistiques' },
    { label: 'Paramètres',      icon: Settings,         path: '/superadmin/parametres' },
  ],
}

const ROLE_LABELS = {
  super_admin: 'Super Administrateur', founder: 'Fondateur', school_admin: 'Directeur',
  accountant: 'Comptable', teacher: 'Enseignant', student: 'Élève', parent: 'Parent', surveillant: 'Surveillant',
}

// Regroupement des entrées de menu en sections (style Linear)
const GROUP_OF = {
  'Tableau de bord': 'Général', 'Statistiques': 'Général', 'Paramètres': 'Général', 'Abonnements': 'Général',
  'Élèves': 'Gestion', 'Personnel': 'Gestion', 'Classes': 'Gestion', 'Mes écoles': 'Gestion', 'Utilisateurs': 'Gestion', 'Écoles': 'Gestion', 'Mes classes': 'Gestion',
  'Présences': 'Académique', 'Notes': 'Académique', 'Devoirs': 'Académique', 'Emploi du temps': 'Académique', 'Résultats': 'Académique', 'Discipline': 'Académique',
  'Finances': 'Finances', 'Paiements': 'Finances', 'Dépenses': 'Finances', 'Rapports': 'Finances',
  'Messages': 'Communication', 'Annonces': 'Communication',
}
const GROUP_ORDER = ['Général', 'Gestion', 'Académique', 'Finances', 'Communication']

function buildGroups(items) {
  const map = {}
  items.forEach(it => { const g = GROUP_OF[it.label] || 'Général'; (map[g] ||= []).push(it) })
  return GROUP_ORDER.filter(g => map[g]).map(g => ({ group: g, items: map[g] }))
}

export default function AppLayout({ children }) {
  const { user, fullName, role, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const accessToken = useAuthStore(s => s.accessToken)
  const updateUser = useAuthStore(s => s.updateUser)
  const { data: uploadStatus } = useUploadStatus()
  const { data: notif } = useNotifications()

  const menuItems = MENUS[role] || []
  const groups = buildGroups(menuItems)
  const bottomItems = menuItems.slice(0, 5)
  const unread = notif?.unreadCount || 0

  useEffect(() => {
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const s = connectSocket(accessToken)
    const refreshNotif = () => qc.invalidateQueries({ queryKey: ['notifications'] })
    const onMessage = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['conversation'] }) }
    const onAnnouncement = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['announcements'] }) }
    const onHomework = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['homework'] }) }
    s.on('notification', refreshNotif); s.on('message:new', onMessage); s.on('announcement:new', onAnnouncement); s.on('homework:new', onHomework)
    return () => { s.off('notification', refreshNotif); s.off('message:new', onMessage); s.off('announcement:new', onAnnouncement); s.off('homework:new', onHomework) }
  }, [qc, accessToken])

  const handleLogout = async () => {
    if (!window.confirm('Voulez-vous vous déconnecter ?')) return
    disconnectSocket()
    await logout()
    navigate('/login')
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const navItem = (item, idx) => {
    const isMessages = item.label === 'Messages'
    return (
      <motion.div key={item.path} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
        <NavLink to={item.path} end={item.path.split('/').length === 2} onClick={() => setSidebarOpen(false)}
          className={({ isActive }) => clsx(
            'relative flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
            isActive
              ? 'bg-brand-50 text-brand-700 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-brand-600'
              : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
          )}>
          {({ isActive }) => (
            <>
              <item.icon size={18} className={isActive ? 'text-brand-600' : 'text-surface-400'} />
              <span className="flex-1">{item.label}</span>
              {isMessages && unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </>
          )}
        </NavLink>
      </motion.div>
    )
  }

  const SidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-secondary-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-surface-900 font-display text-sm leading-none">EduConnect</p>
          <p className="text-[10px] text-surface-400 mt-1 truncate max-w-[140px]">{user?.school_name || 'Plateforme scolaire'}</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-surface-400 hover:text-surface-600"><X size={18} /></button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map(({ group, items }) => (
          <div key={group} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold text-surface-400 uppercase tracking-widest">{group}</p>
            <div className="space-y-0.5">{items.map((it, i) => navItem(it, i))}</div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-surface-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-50 transition-colors">
          <AvatarUploader user={user} size="sm" enabled={uploadStatus?.enabled} onUploaded={(url) => updateUser({ avatar_url: url })} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{fullName}</p>
            <p className="text-xs text-surface-400 truncate">{ROLE_LABELS[role] || role}</p>
          </div>
          <button onClick={handleLogout} title="Se déconnecter" className="text-surface-300 hover:text-red-500 transition-colors shrink-0"><LogOut size={16} /></button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {role === 'school_admin' && <OnboardingWizard />}

      {/* Overlay mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-surface-100 flex-col sticky top-0 h-screen">{SidebarContent}</aside>

      {/* Drawer mobile */}
      <motion.aside initial={false} animate={{ x: sidebarOpen ? 0 : '-100%' }} transition={{ type: 'tween', duration: 0.25 }}
        className="fixed top-0 left-0 h-full w-72 bg-white border-r border-surface-100 flex flex-col z-40 lg:hidden">
        {SidebarContent}
      </motion.aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-surface-100 flex items-center px-4 gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-surface-500 hover:text-surface-700"><Menu size={22} /></button>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-surface-900 leading-none">Bonjour, {user?.first_name} 👋</p>
            <p className="text-xs text-surface-400 mt-1 capitalize">{today}</p>
          </div>

          <div className="flex-1 max-w-md mx-auto hidden md:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input placeholder="Rechercher…" className="w-full pl-9 pr-3 py-2 bg-surface-50 border border-surface-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors" />
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          <NotificationBell role={role} />

          {user?.school_plan && (
            <Badge variant={user.school_plan === 'premium' ? 'primary' : 'default'} className="hidden sm:inline-flex">
              {user.school_plan === 'premium' ? '✦ Premium' : 'Gratuit'}
            </Badge>
          )}

          {/* Dropdown profil */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(o => !o)} className="flex items-center gap-1.5">
              <Avatar firstName={user?.first_name} lastName={user?.last_name} src={user?.avatar_url} size="sm" role={role} />
              <ChevronDown size={14} className="text-surface-400 hidden sm:block" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.16 }} style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-surface-100 shadow-premium z-50 overflow-hidden">
                  <div className="p-4 border-b border-surface-100">
                    <p className="font-semibold text-surface-900 text-sm">{fullName}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{user?.email || ROLE_LABELS[role]}</p>
                    <p className="text-[11px] text-brand-600 mt-1 font-medium">{ROLE_LABELS[role] || role}</p>
                  </div>
                  <div className="p-1.5">
                    {role === 'super_admin' && (
                      <button onClick={() => { setProfileOpen(false); navigate('/superadmin/parametres') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                        <Settings size={16} /> Paramètres
                      </button>
                    )}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom bar mobile (app native) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-surface-100 z-30 flex">
        {bottomItems.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path.split('/').length === 2}
            className={({ isActive }) => clsx('flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-[10px] font-medium transition-colors',
              isActive ? 'text-brand-600' : 'text-surface-400')}>
            {({ isActive }) => (<><item.icon size={20} className={isActive ? 'text-brand-600' : 'text-surface-400'} /><span className="truncate max-w-[60px]">{item.label.replace('Tableau de bord', 'Accueil')}</span></>)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

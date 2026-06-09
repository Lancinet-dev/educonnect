import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  MessageSquare, CreditCard, BarChart3, Settings,
  Bell, LogOut, Menu, X, GraduationCap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { clsx } from 'clsx'

const MENUS = {
  parent: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/parent' },
    { label: 'Résultats',       icon: BookOpen,         path: '/parent/resultats' },
    { label: 'Présences',       icon: ClipboardList,    path: '/parent/presences' },
    { label: 'Paiements',       icon: CreditCard,       path: '/parent/paiements' },
    { label: 'Messages',        icon: MessageSquare,    path: '/parent/messages' },
  ],
  student: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/student' },
    { label: 'Notes',           icon: BookOpen,         path: '/student/notes' },
    { label: 'Devoirs',         icon: ClipboardList,    path: '/student/devoirs' },
    { label: 'Emploi du temps', icon: BarChart3,        path: '/student/emploi-du-temps' },
    { label: 'Messages',        icon: MessageSquare,    path: '/student/messages' },
  ],
  teacher: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/teacher' },
    { label: 'Mes classes',     icon: Users,            path: '/teacher/classes' },
    { label: 'Présences',       icon: ClipboardList,    path: '/teacher/presences' },
    { label: 'Notes',           icon: BookOpen,         path: '/teacher/notes' },
    { label: 'Messages',        icon: MessageSquare,    path: '/teacher/messages' },
  ],
  school_admin: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/director' },
    { label: 'Élèves',          icon: Users,            path: '/director/eleves' },
    { label: 'Personnel',       icon: Users,            path: '/director/personnel' },
    { label: 'Classes',         icon: BookOpen,         path: '/director/classes' },
    { label: 'Finances',        icon: CreditCard,       path: '/director/finances' },
    { label: 'Messages',        icon: MessageSquare,    path: '/director/messages' },
    { label: 'Rapports',        icon: BarChart3,        path: '/director/rapports' },
  ],
  accountant: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/accountant' },
    { label: 'Paiements',       icon: CreditCard,       path: '/accountant/paiements' },
    { label: 'Dépenses',        icon: CreditCard,       path: '/accountant/depenses' },
    { label: 'Rapports',        icon: BarChart3,        path: '/accountant/rapports' },
  ],
  founder: [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/founder' },
    { label: 'Mes écoles',      icon: GraduationCap,   path: '/founder/ecoles' },
    { label: 'Finances',        icon: CreditCard,       path: '/founder/finances' },
    { label: 'Rapports',        icon: BarChart3,        path: '/founder/rapports' },
    { label: 'Messages',        icon: MessageSquare,    path: '/founder/messages' },
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
  super_admin:  'Super Administrateur',
  founder:      'Fondateur',
  school_admin: 'Directeur',
  accountant:   'Comptable',
  teacher:      'Enseignant',
  student:      'Élève',
  parent:       'Parent',
  surveillant:  'Surveillant',
}

export default function AppLayout({ children }) {
  const { user, fullName, role, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const menuItems = MENUS[role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-surface-200',
        'flex flex-col z-30 transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-surface-900 font-display text-sm leading-none">
              EduConnect
            </p>
            <p className="text-[10px] text-surface-400 mt-0.5 truncate max-w-[140px]">
              {user?.school_name || 'Plateforme scolaire'}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-surface-400 hover:text-surface-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path.split('/').length === 2}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-150',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-brand-600' : 'text-surface-400'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profil en bas */}
        <div className="px-3 py-4 border-t border-surface-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-50
                          transition-colors cursor-pointer">
            <Avatar
              firstName={user?.first_name}
              lastName={user?.last_name}
              src={user?.avatar_url}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{fullName}</p>
              <p className="text-xs text-surface-400 truncate">
                {ROLE_LABELS[role] || role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="text-surface-300 hover:text-red-500 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-surface-200 flex items-center
                           px-4 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-surface-500 hover:text-surface-700"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Notifications */}
          <button className="relative text-surface-500 hover:text-surface-700 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-500
                             rounded-full border border-white" />
          </button>

          {/* Badge plan */}
          {user?.school_plan && (
            <Badge variant={user.school_plan === 'premium' ? 'primary' : 'default'}>
              {user.school_plan === 'premium' ? '✦ Premium' : 'Gratuit'}
            </Badge>
          )}

          <Avatar
            firstName={user?.first_name}
            lastName={user?.last_name}
            src={user?.avatar_url}
            size="sm"
          />
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

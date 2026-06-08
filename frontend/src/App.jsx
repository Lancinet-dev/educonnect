import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Pages auth
import LoginPage from '@/pages/auth/LoginPage'

// Pages par rôle (placeholders pour l'instant — à compléter plus tard)
import ParentDashboard    from '@/pages/parent/ParentDashboard'
import StudentDashboard   from '@/pages/student/StudentDashboard'
import TeacherDashboard   from '@/pages/teacher/TeacherDashboard'
import AccountantDashboard from '@/pages/accountant/AccountantDashboard'
import DirectorDashboard  from '@/pages/director/DirectorDashboard'
import FounderDashboard   from '@/pages/founder/FounderDashboard'
import SuperAdminDashboard from '@/pages/superadmin/SuperAdminDashboard'

// Composant de protection des routes
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Redirection intelligente selon le rôle
function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const routes = {
    super_admin:  '/superadmin',
    founder:      '/founder',
    school_admin: '/director',
    accountant:   '/accountant',
    teacher:      '/teacher',
    student:      '/student',
    parent:       '/parent',
  }
  return <Navigate to={routes[user?.role] || '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirection racine */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Routes protégées par rôle */}
      <Route path="/parent/*"     element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/student/*"    element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/teacher/*"    element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/accountant/*" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
      <Route path="/director/*"   element={<ProtectedRoute allowedRoles={['school_admin']}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/founder/*"    element={<ProtectedRoute allowedRoles={['founder']}><FounderDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/*" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

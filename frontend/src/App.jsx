import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterSchoolPage from '@/pages/auth/RegisterSchoolPage'

// Dashboards
import ParentDashboard     from '@/pages/parent/ParentDashboard'
import StudentDashboard    from '@/pages/student/StudentDashboard'
import TeacherDashboard    from '@/pages/teacher/TeacherDashboard'
import AccountantDashboard from '@/pages/accountant/AccountantDashboard'
import DirectorDashboard   from '@/pages/director/DirectorDashboard'
import FounderDashboard    from '@/pages/founder/FounderDashboard'
import SuperAdminDashboard from '@/pages/superadmin/SuperAdminDashboard'
import SurveillantDashboard from '@/pages/surveillant/SurveillantDashboard'

// Protection des routes avec layout intégré
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout>{children}</AppLayout>
}

// Redirection selon le rôle
function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const routes = {
    super_admin:  '/superadmin',
    founder:      '/founder',
    school_admin: '/director',
    accountant:   '/accountant',
    surveillant:  '/surveillant',
    teacher:      '/teacher',
    student:      '/student',
    parent:       '/parent',
  }
  return <Navigate to={routes[user?.role] || '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterSchoolPage />} />
      <Route path="/"      element={<RoleRedirect />} />

      <Route path="/parent/*"
        element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/student/*"
        element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/teacher/*"
        element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/accountant/*"
        element={<ProtectedRoute allowedRoles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
      <Route path="/surveillant/*"
        element={<ProtectedRoute allowedRoles={['surveillant']}><SurveillantDashboard /></ProtectedRoute>} />
      <Route path="/director/*"
        element={<ProtectedRoute allowedRoles={['school_admin']}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/founder/*"
        element={<ProtectedRoute allowedRoles={['founder']}><FounderDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/*"
        element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

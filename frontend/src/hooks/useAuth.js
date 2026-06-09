import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'

export function useAuth() {
  const store   = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.post('/auth/login', credentials),
    onSuccess: ({ data }) => {
      store.setAuth(data.user, data.accessToken)
      localStorage.setItem('educonnect-refresh-token', data.refreshToken)
      toast.success(`Bienvenue, ${data.user.first_name} !`)

      // Redirection selon le rôle
      const routes = {
        super_admin:  '/superadmin',
        founder:      '/founder',
        school_admin: '/director',
        accountant:   '/accountant',
        teacher:      '/teacher',
        student:      '/student',
        parent:       '/parent',
      }
      navigate(routes[data.user.role] || '/')
    },
  })

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('educonnect-refresh-token')
      await api.post('/auth/logout', { refreshToken })
    } finally {
      store.logout()
      localStorage.removeItem('educonnect-refresh-token')
      navigate('/login')
    }
  }

  return {
    user:            store.user,
    isAuthenticated: store.isAuthenticated,
    role:            store.getRole(),
    fullName:        store.getFullName(),
    schoolId:        store.getSchoolId(),
    login:           loginMutation.mutateAsync,
    isLoggingIn:     loginMutation.isPending,
    logout,
  }
}

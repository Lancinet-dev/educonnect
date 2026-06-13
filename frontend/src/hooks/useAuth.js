import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { disconnectSocket } from '@/services/socket'
import toast from 'react-hot-toast'

export function useAuth() {
  const store    = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.post('/auth/login', credentials),
    onSuccess: ({ data }) => {
      // Repartir d'un cache vierge : aucune donnée d'un compte précédent
      // ne doit subsister dans ce navigateur (confidentialité).
      queryClient.clear()
      disconnectSocket()
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

  const registerMutation = useMutation({
    mutationFn: (payload) => api.post('/auth/register-school', payload),
    onSuccess: ({ data }) => {
      queryClient.clear()
      disconnectSocket()
      store.setAuth(data.user, data.accessToken)
      localStorage.setItem('educonnect-refresh-token', data.refreshToken)
      toast.success(`Bienvenue sur EduConnect, ${data.user.first_name} !`)
      navigate('/director')
    },
  })

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('educonnect-refresh-token')
      await api.post('/auth/logout', { refreshToken })
    } finally {
      disconnectSocket()
      store.logout()
      localStorage.removeItem('educonnect-refresh-token')
      // Purger tout le cache pour qu'aucune donnée ne reste accessible
      queryClient.clear()
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
    register:        registerMutation.mutateAsync,
    isRegistering:   registerMutation.isPending,
    logout,
  }
}

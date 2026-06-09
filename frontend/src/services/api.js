import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor request : ajouter le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor response : gérer les 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        // Tenter un refresh token
        const refreshToken = localStorage.getItem('educonnect-refresh-token')
        if (!refreshToken) throw new Error('Pas de refresh token')

        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        useAuthStore.getState().setAuth(useAuthStore.getState().user, data.accessToken)
        localStorage.setItem('educonnect-refresh-token', data.refreshToken)

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        localStorage.removeItem('educonnect-refresh-token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

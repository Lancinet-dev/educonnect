import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 30000,
  })
}

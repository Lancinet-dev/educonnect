import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useSuperAdminOverview() {
  return useQuery({
    queryKey: ['superadmin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/superadmin/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

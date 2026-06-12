import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useAccountantOverview() {
  return useQuery({
    queryKey: ['accountant', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/accountant/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

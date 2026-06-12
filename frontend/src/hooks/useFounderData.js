import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useFounderOverview() {
  return useQuery({
    queryKey: ['founder', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/founder/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

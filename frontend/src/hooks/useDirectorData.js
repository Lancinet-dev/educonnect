import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useDirectorOverview() {
  return useQuery({
    queryKey: ['director', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/director/overview')
      return data
    },
    refetchInterval: 60000, // Rafraîchir chaque minute
  })
}

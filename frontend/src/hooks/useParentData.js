import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useParentOverview() {
  return useQuery({
    queryKey: ['parent', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/parent/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

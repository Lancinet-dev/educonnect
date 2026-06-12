import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useStudentOverview() {
  return useQuery({
    queryKey: ['student', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/student/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

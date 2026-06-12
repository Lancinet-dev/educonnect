import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useTeacherOverview() {
  return useQuery({
    queryKey: ['teacher', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/teacher/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export function useFounderSchoolDetail(id) {
  return useQuery({
    queryKey: ['founder', 'school', id],
    queryFn: async () => (await api.get(`/founder/schools/${id}/detail`)).data,
    enabled: !!id,
  })
}

export function useAddNetworkSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/founder/schools', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['founder'] })
      qc.invalidateQueries({ queryKey: ['reports', 'founder'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useDirectorIncidents(classId = '') {
  return useQuery({
    queryKey: ['incidents', 'director', classId],
    queryFn: async () => (await api.get('/incidents/director', { params: classId ? { classId } : {} })).data,
  })
}

export function useParentIncidents() {
  return useQuery({
    queryKey: ['incidents', 'parent'],
    queryFn: async () => (await api.get('/incidents/parent')).data,
  })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/incidents', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

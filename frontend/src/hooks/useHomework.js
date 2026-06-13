import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useTeacherHomework(classId) {
  return useQuery({
    queryKey: ['homework', 'teacher', classId],
    queryFn: async () => (await api.get('/homework/teacher', { params: { classId } })).data,
  })
}

export function useStudentHomework() {
  return useQuery({
    queryKey: ['homework', 'student'],
    queryFn: async () => (await api.get('/homework/student')).data,
  })
}

export function useParentHomework() {
  return useQuery({
    queryKey: ['homework', 'parent'],
    queryFn: async () => (await api.get('/homework/parent')).data,
  })
}

export function useCreateHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/homework', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  })
}

export function useUpdateHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/homework/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  })
}

export function useDeleteHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/homework/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  })
}

export function useToggleHomeworkDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }) =>
      done ? (await api.post(`/homework/${id}/done`)).data
           : (await api.delete(`/homework/${id}/done`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

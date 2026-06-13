import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useTimetableMeta() {
  return useQuery({ queryKey: ['timetable', 'meta'], queryFn: async () => (await api.get('/timetable/meta')).data })
}

export function useClassTimetable(classId) {
  return useQuery({
    queryKey: ['timetable', 'class', classId],
    queryFn: async () => (await api.get(`/timetable/class/${classId}`)).data,
    enabled: !!classId,
  })
}

export function useTeacherTimetable(teacherId) {
  return useQuery({
    queryKey: ['timetable', 'teacher', teacherId],
    queryFn: async () => (await api.get(`/timetable/teacher/${teacherId}`)).data,
    enabled: !!teacherId,
  })
}

export function useMyWeek() {
  return useQuery({ queryKey: ['timetable', 'my-week'], queryFn: async () => (await api.get('/timetable/my-week')).data })
}

export function useCreateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/timetable/slots', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  })
}

export function useUpdateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/timetable/slots/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  })
}

export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/timetable/slots/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  })
}

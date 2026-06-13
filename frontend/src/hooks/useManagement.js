import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

const inval = (qc) => () => qc.invalidateQueries({ queryKey: ['management'] })

// ── Élèves ────────────────────────────────────────────────────
export function useMgmtStudents(q = '', classId = '') {
  return useQuery({
    queryKey: ['management', 'students', q, classId],
    queryFn: async () => (await api.get('/management/students', { params: { q, classId } })).data,
  })
}
export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (p) => (await api.post('/management/students', p)).data, onSuccess: inval(qc) })
}
export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, ...p }) => (await api.put(`/management/students/${id}`, p)).data, onSuccess: inval(qc) })
}
export function useToggleStudentActive() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, isActive }) => (await api.patch(`/management/students/${id}/active`, { isActive })).data, onSuccess: inval(qc) })
}

// ── Personnel ─────────────────────────────────────────────────
export function useMgmtStaff() {
  return useQuery({ queryKey: ['management', 'staff'], queryFn: async () => (await api.get('/management/staff')).data })
}
export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (p) => (await api.post('/management/staff', p)).data, onSuccess: inval(qc) })
}
export function useUpdateStaff() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, ...p }) => (await api.put(`/management/staff/${id}`, p)).data, onSuccess: inval(qc) })
}
export function useToggleStaffActive() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, isActive }) => (await api.patch(`/management/staff/${id}/active`, { isActive })).data, onSuccess: inval(qc) })
}

export function useUpdateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p) => (await api.patch('/management/school', p)).data,
    onSuccess: () => inval(qc)(),
  })
}

// ── Niveaux & Classes ─────────────────────────────────────────
export function useLevels() {
  return useQuery({ queryKey: ['management', 'levels'], queryFn: async () => (await api.get('/management/levels')).data })
}
export function useCreateLevel() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (p) => (await api.post('/management/levels', p)).data, onSuccess: inval(qc) })
}
export function useMgmtClasses() {
  return useQuery({ queryKey: ['management', 'classes'], queryFn: async () => (await api.get('/management/classes')).data })
}
export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (p) => (await api.post('/management/classes', p)).data, onSuccess: inval(qc) })
}
export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ id, ...p }) => (await api.put(`/management/classes/${id}`, p)).data, onSuccess: inval(qc) })
}
export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id) => (await api.delete(`/management/classes/${id}`)).data, onSuccess: inval(qc) })
}
export function useAssignTeacher() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ classId, teacherId, isMain }) => (await api.post(`/management/classes/${classId}/teachers`, { teacherId, isMain })).data, onSuccess: inval(qc) })
}
export function useRemoveTeacher() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ classId, teacherId }) => (await api.delete(`/management/classes/${classId}/teachers/${teacherId}`)).data, onSuccess: inval(qc) })
}

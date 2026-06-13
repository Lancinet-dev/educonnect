import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useSuperAdminOverview() {
  return useQuery({
    queryKey: ['superadmin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/superadmin/overview')
      return data
    },
    refetchInterval: 60000,
  })
}

export function useSuperAdminSchools() {
  return useQuery({
    queryKey: ['superadmin', 'schools'],
    queryFn: async () => (await api.get('/superadmin/schools')).data,
  })
}

export function useChangeSchoolPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, plan }) => (await api.patch(`/superadmin/schools/${id}/plan`, { plan })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin'] })
    },
  })
}

export function useToggleSchoolActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }) => (await api.patch(`/superadmin/schools/${id}/active`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })
}

export function useSuperAdminUsers(filters = {}) {
  return useQuery({
    queryKey: ['superadmin', 'users', filters],
    queryFn: async () => (await api.get('/superadmin/users', { params: filters })).data,
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }) => (await api.patch(`/superadmin/users/${id}/active`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin', 'users'] }),
  })
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: async () => (await api.get('/superadmin/stats')).data,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['superadmin', 'settings'],
    queryFn: async () => (await api.get('/superadmin/settings')).data,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.patch('/superadmin/settings', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })
}

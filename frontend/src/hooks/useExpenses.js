import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useExpenses(filters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => (await api.get('/expenses', { params: filters })).data,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p) => (await api.post('/expenses', p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['accountant', 'overview'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...p }) => (await api.put(`/expenses/${id}`, p)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['accountant', 'overview'] }); qc.invalidateQueries({ queryKey: ['reports'] }) },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['accountant', 'overview'] }); qc.invalidateQueries({ queryKey: ['reports'] }) },
  })
}

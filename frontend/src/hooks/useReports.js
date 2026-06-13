import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'

export function useFinancialReport(month, year) {
  return useQuery({
    queryKey: ['reports', 'financial', month, year],
    queryFn: async () => (await api.get('/reports/financial', { params: { month, year } })).data,
  })
}

export function useAcademicReport() {
  return useQuery({
    queryKey: ['reports', 'academic'],
    queryFn: async () => (await api.get('/reports/academic')).data,
  })
}

export function useFounderReport(month, year) {
  return useQuery({
    queryKey: ['reports', 'founder', month, year],
    queryFn: async () => (await api.get('/reports/founder', { params: { month, year } })).data,
  })
}

export async function downloadReport(path, filename, params = {}) {
  try {
    const res = await api.get(path, { params, responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)
  } catch { toast.error('Impossible de générer le PDF.') }
}

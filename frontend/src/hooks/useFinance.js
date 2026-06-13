import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'

export function useFinanceClasses() {
  return useQuery({
    queryKey: ['finance', 'classes'],
    queryFn: async () => (await api.get('/finance/classes')).data,
  })
}

export function useFinanceStudents(q, classId) {
  return useQuery({
    queryKey: ['finance', 'students', q, classId],
    queryFn: async () => (await api.get('/finance/students', { params: { q, classId } })).data,
  })
}

export function useStudentInvoices(studentId) {
  return useQuery({
    queryKey: ['finance', 'invoices', studentId],
    queryFn: async () => (await api.get(`/finance/students/${studentId}/invoices`)).data,
    enabled: !!studentId,
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, amount, method, reference }) =>
      (await api.post(`/finance/invoices/${invoiceId}/payments`, { amount, method, reference })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] })
      qc.invalidateQueries({ queryKey: ['accountant', 'overview'] })
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/finance/invoices', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance'] }),
  })
}

export function useDirectorFinance(classId) {
  return useQuery({
    queryKey: ['finance', 'director', classId],
    queryFn: async () => (await api.get('/finance/director', { params: { classId } })).data,
  })
}

export function useParentFinance() {
  return useQuery({
    queryKey: ['finance', 'parent'],
    queryFn: async () => (await api.get('/finance/parent')).data,
  })
}

// Téléchargement du reçu PDF
export async function downloadReceipt(paymentId, receiptNumber = 'recu') {
  try {
    const res = await api.get(`/finance/receipt/${paymentId}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${receiptNumber}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)
  } catch { toast.error('Impossible de générer le reçu.') }
}

// Export CSV des impayés
export async function downloadUnpaidCsv() {
  try {
    const res = await api.get('/finance/director/unpaid.csv', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'impayes.csv'
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)
  } catch { toast.error("Impossible d'exporter la liste.") }
}

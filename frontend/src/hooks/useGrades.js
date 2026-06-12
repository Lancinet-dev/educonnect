import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/services/api'

// ── Enseignant ────────────────────────────────────────────────
export function useGradeSubjects() {
  return useQuery({
    queryKey: ['grades', 'subjects'],
    queryFn: async () => (await api.get('/grades/subjects')).data,
  })
}

export function useClassStudents(classId) {
  return useQuery({
    queryKey: ['grades', 'students', classId],
    queryFn: async () => (await api.get('/grades/students', { params: { classId } })).data,
    enabled: !!classId,
  })
}

export function useTeacherEvaluations(filters = {}) {
  return useQuery({
    queryKey: ['grades', 'evaluations', filters],
    queryFn: async () => (await api.get('/grades/evaluations', { params: filters })).data,
  })
}

export function useEvaluationDetail(evaluationId) {
  return useQuery({
    queryKey: ['grades', 'evaluation', evaluationId],
    queryFn: async () => (await api.get(`/grades/evaluation/${evaluationId}`)).data,
    enabled: !!evaluationId,
  })
}

export function useSaveEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => (await api.post('/grades/evaluations', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', 'evaluations'] })
    },
  })
}

// ── Élève / Parent ────────────────────────────────────────────
export function useMyResults() {
  return useQuery({
    queryKey: ['grades', 'me'],
    queryFn: async () => (await api.get('/grades/me/results')).data,
  })
}

export function useParentResults() {
  return useQuery({
    queryKey: ['grades', 'parent'],
    queryFn: async () => (await api.get('/grades/parent/results')).data,
  })
}

// ── Téléchargement du bulletin PDF ────────────────────────────
export async function downloadBulletin(studentId, fullName = 'eleve') {
  try {
    const res = await api.get(`/grades/bulletin/${studentId}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bulletin-${fullName.replace(/\s+/g, '-')}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch {
    toast.error('Impossible de générer le bulletin.')
  }
}

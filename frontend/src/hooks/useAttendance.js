import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

// Classes accessibles (enseignant : les siennes ; directeur : toutes)
export function useAttendanceClasses() {
  return useQuery({
    queryKey: ['attendance', 'classes'],
    queryFn: async () => (await api.get('/attendance/classes')).data,
  })
}

// Liste des élèves d'une classe + statut pour une date
export function useClassRoster(classId, date) {
  return useQuery({
    queryKey: ['attendance', 'roster', classId, date],
    queryFn: async () => (await api.get(`/attendance/class/${classId}`, { params: { date } })).data,
    enabled: !!classId,
  })
}

// Enregistrer l'appel en lot
export function useSaveAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ classId, date, records }) =>
      (await api.post(`/attendance/class/${classId}`, { date, records })).data,
    onSuccess: (_data, { classId, date }) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'roster', classId, date] })
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] })
    },
  })
}

// Statistiques globales (directeur)
export function useDirectorAttendanceStats() {
  return useQuery({
    queryKey: ['attendance', 'director', 'stats'],
    queryFn: async () => (await api.get('/attendance/director/stats')).data,
  })
}

// Calendrier de présence des enfants (parent)
export function useParentAttendance() {
  return useQuery({
    queryKey: ['attendance', 'parent'],
    queryFn: async () => (await api.get('/attendance/parent')).data,
  })
}

import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

// Indique si le service d'upload (Cloudinary) est configuré côté serveur
export function useUploadStatus() {
  return useQuery({
    queryKey: ['upload', 'status'],
    queryFn: async () => (await api.get('/upload/status')).data,
    staleTime: 1000 * 60 * 30,
  })
}

// Multipart : on laisse axios fixer le bon Content-Type (avec boundary)
const multipart = { headers: { 'Content-Type': undefined } }

export async function uploadAvatar(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/upload/avatar', fd, multipart)
  return data.url
}

export async function uploadHomeworkFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/upload/homework', fd, multipart)
  return data // { url, name }
}

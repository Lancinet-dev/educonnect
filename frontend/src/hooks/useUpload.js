import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Indique si le service d'upload (Cloudinary) est configuré côté serveur
export function useUploadStatus() {
  return useQuery({
    queryKey: ['upload', 'status'],
    queryFn: async () => (await api.get('/upload/status')).data,
    staleTime: 1000 * 60 * 30,
  })
}

// Upload via fetch : le navigateur pose lui-même le bon Content-Type
// multipart/form-data (avec boundary). Plus fiable que de bricoler les
// en-têtes d'axios. Réessaie une fois en cas d'échec réseau transitoire.
async function uploadFile(path, file, attempt = 0) {
  const fd = new FormData()
  fd.append('file', file)
  const token = useAuthStore.getState().accessToken

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
  } catch (networkErr) {
    if (attempt < 1) return uploadFile(path, file, attempt + 1)
    throw networkErr
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // 5xx transitoire → on retente une fois
    if (res.status >= 500 && attempt < 1) return uploadFile(path, file, attempt + 1)
    const err = new Error(data.error || "Échec de l'envoi du fichier.")
    err.response = { data, status: res.status }
    throw err
  }
  return data
}

export async function uploadAvatar(file) {
  const data = await uploadFile('/upload/avatar', file)
  return data.url
}

export async function uploadHomeworkFile(file) {
  return uploadFile('/upload/homework', file) // { url, name }
}

export async function uploadDocument(file) {
  return uploadFile('/upload/document', file) // { url, name }
}

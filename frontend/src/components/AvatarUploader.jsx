import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '@/components/ui/Avatar'
import { uploadAvatar } from '@/hooks/useUpload'

// Avatar cliquable qui permet de changer sa photo (si l'upload est activé)
export default function AvatarUploader({ user, size = 'sm', enabled, onUploaded }) {
  const inputRef = useRef()
  const [busy, setBusy] = useState(false)

  const onChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadAvatar(file)
      onUploaded?.(url)
      toast.success('Photo de profil mise à jour')
    } catch (err) {
      toast.error(err?.response?.data?.error || "Échec de l'envoi de la photo.")
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className={`relative shrink-0 ${enabled ? 'cursor-pointer group' : ''}`}
      onClick={() => enabled && inputRef.current?.click()}
      title={enabled ? 'Changer la photo' : undefined}>
      <Avatar firstName={user?.first_name} lastName={user?.last_name} src={user?.avatar_url} size={size} />
      {enabled && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white">
          <Camera size={8} className="text-white" />
        </span>
      )}
      {busy && <span className="absolute inset-0 bg-white/60 rounded-full animate-pulse" />}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  )
}

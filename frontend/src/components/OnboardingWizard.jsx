import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Sparkles, Image as ImageIcon, BookOpen, UserPlus, Check, ArrowRight, FileUp } from 'lucide-react'
import { useMgmtClasses, useCreateClass, useCreateStaff, useUpdateSchool } from '@/hooks/useManagement'
import { useUploadStatus, uploadDocument } from '@/hooks/useUpload'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'

const KEY = (id) => `educonnect-onboarding-${id}`
const input = 'w-full px-3 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function OnboardingWizard() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const { data: classes, isLoading } = useMgmtClasses()
  const createClass = useCreateClass()
  const createStaff = useCreateStaff()
  const updateSchool = useUpdateSchool()
  const { data: uploadStatus } = useUploadStatus()

  const schoolId = user?.school_id
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(KEY(schoolId)))
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [cls, setCls] = useState({ name: '', room: '' })
  const [teacher, setTeacher] = useState({ firstName: '', lastName: '', email: '' })

  // Ne s'affiche que pour un directeur dont l'école n'a aucune classe
  if (isLoading || dismissed || !classes || classes.length > 0) return null

  const finish = () => { localStorage.setItem(KEY(schoolId), 'done'); setDismissed(true) }

  const steps = [
    { icon: Sparkles, title: `Bienvenue, ${user?.first_name} 👋`, sub: 'Configurons votre école en quelques étapes.' },
    { icon: ImageIcon, title: 'Logo de votre école', sub: 'Ajoutez votre logo (optionnel).' },
    { icon: BookOpen, title: 'Votre première classe', sub: 'Créez une classe pour commencer.' },
    { icon: UserPlus, title: 'Invitez un enseignant', sub: 'Ajoutez votre premier enseignant (optionnel).' },
  ]
  const S = steps[step]

  const onLogo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try { const r = await uploadDocument(file); setLogoUrl(r.url); await updateSchool.mutateAsync({ logoUrl: r.url }); updateUser({ school_logo: r.url }); toast.success('Logo enregistré') }
    catch { toast.error('Échec de l\'upload.') } finally { setBusy(false); e.target.value = '' }
  }

  const next = async () => {
    if (step === 2) {
      if (!cls.name.trim()) { toast.error('Donnez un nom à la classe.'); return }
      setBusy(true)
      try { await createClass.mutateAsync({ name: cls.name.trim(), room: cls.room, maxStudents: 40 }); toast.success('Classe créée') }
      catch (e) { toast.error(e?.response?.data?.error || 'Échec.'); setBusy(false); return }
      setBusy(false)
    }
    if (step === 3) {
      if (teacher.firstName.trim() && teacher.lastName.trim() && teacher.email.trim()) {
        setBusy(true)
        try { const r = await createStaff.mutateAsync({ ...teacher, role: 'teacher' }); toast.success(`Enseignant créé${r.defaultPassword ? ` · mdp : ${r.defaultPassword}` : ''}`) }
        catch (e) { toast.error(e?.response?.data?.error || 'Échec.'); setBusy(false); return }
        setBusy(false)
      }
      finish(); return
    }
    setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-premium overflow-hidden">
        {/* Barre de progression */}
        <div className="h-1.5 bg-surface-100">
          <motion.div className="h-full bg-gradient-to-r from-brand-600 to-secondary-600" animate={{ width: `${((step + 1) / 4) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>

        <div className="p-7">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-brand-600">Étape {step + 1} / 4</span>
            <button onClick={finish} className="text-xs text-surface-400 hover:text-surface-600">Je ferai ça plus tard</button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-secondary-600 flex items-center justify-center mb-4 shadow-glow">
                <S.icon size={26} className="text-white" />
              </div>
              <h2 className="text-xl font-bold font-display text-surface-900">{S.title}</h2>
              <p className="text-surface-500 text-sm mt-1">{S.sub}</p>

              <div className="mt-5 min-h-[96px]">
                {step === 0 && (
                  <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                    <p className="text-xs text-surface-500 uppercase tracking-wide">Votre école</p>
                    <p className="font-semibold text-surface-900 mt-0.5">{user?.school_name}</p>
                  </div>
                )}
                {step === 1 && (
                  uploadStatus?.enabled ? (
                    logoUrl ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                        <img src={logoUrl} alt="logo" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-sm text-emerald-700 font-medium flex items-center gap-1"><Check size={15} /> Logo ajouté</span>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-surface-300 text-surface-500 text-sm cursor-pointer hover:border-brand-300">
                        <FileUp size={18} /> {busy ? 'Envoi…' : 'Choisir un logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={busy} />
                      </label>
                    )
                  ) : <p className="text-sm text-surface-400">Upload non configuré — vous pourrez ajouter le logo plus tard.</p>
                )}
                {step === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    <input value={cls.name} onChange={e => setCls(c => ({ ...c, name: e.target.value }))} placeholder="Nom (ex : CM2 A)" className={input} />
                    <input value={cls.room} onChange={e => setCls(c => ({ ...c, room: e.target.value }))} placeholder="Salle (optionnel)" className={input} />
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={teacher.firstName} onChange={e => setTeacher(t => ({ ...t, firstName: e.target.value }))} placeholder="Prénom" className={input} />
                      <input value={teacher.lastName} onChange={e => setTeacher(t => ({ ...t, lastName: e.target.value }))} placeholder="Nom" className={input} />
                    </div>
                    <input value={teacher.email} onChange={e => setTeacher(t => ({ ...t, email: e.target.value }))} placeholder="Email de l'enseignant" className={input} />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-6">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="text-sm text-surface-500 disabled:opacity-0">Retour</button>
            <Button loading={busy} onClick={next} iconRight={step < 3 ? <ArrowRight size={16} /> : <Check size={16} />}>
              {step === 3 ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

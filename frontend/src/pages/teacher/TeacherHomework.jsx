import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, X, Pencil, Trash2, ClipboardList, Paperclip, CheckCircle2, Users, FileUp,
} from 'lucide-react'
import {
  useTeacherHomework, useCreateHomework, useUpdateHomework, useDeleteHomework,
} from '@/hooks/useHomework'
import { useAttendanceClasses } from '@/hooks/useAttendance'
import { useGradeSubjects } from '@/hooks/useGrades'
import { useUploadStatus, uploadHomeworkFile } from '@/hooks/useUpload'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const today = () => new Date().toISOString().slice(0, 10)

// ── Formulaire (création / édition) ───────────────────────────
function HomeworkForm({ initial, onClose }) {
  const isEdit = !!initial
  const create = useCreateHomework()
  const update = useUpdateHomework()
  const { data: classes } = useAttendanceClasses()
  const { data: subjects } = useGradeSubjects()
  const { data: uploadStatus } = useUploadStatus()

  const [classId, setClassId] = useState(initial?.classId || '')
  const [subjectId, setSubjectId] = useState(initial?.subjectId || '')
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [dueDate, setDueDate] = useState(initial ? String(initial.dueDate).slice(0, 10) : '')
  const [attachmentUrl, setAttachmentUrl] = useState(initial?.attachmentUrl || '')
  const [attachmentName, setAttachmentName] = useState(initial?.attachmentUrl ? 'Fichier joint' : '')
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await uploadHomeworkFile(file)
      setAttachmentUrl(r.url); setAttachmentName(r.name)
      toast.success('Pièce jointe ajoutée')
    } catch (err) {
      toast.error(err?.response?.data?.error || "Échec de l'envoi du fichier.")
    } finally { setUploading(false); e.target.value = '' }
  }

  const submit = async () => {
    if (!classId || !title.trim() || !dueDate) { toast.error('Classe, titre et date limite requis.'); return }
    const common = { subjectId: subjectId || null, title: title.trim(), description, dueDate, attachmentUrl: attachmentUrl || null }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, ...common })
        toast.success('Devoir modifié')
      } else {
        await create.mutateAsync({ classId, ...common })
        toast.success('Devoir publié · élèves et parents notifiés')
      }
      onClose()
    } catch { toast.error("Échec de l'enregistrement.") }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">{isEdit ? 'Modifier le devoir' : 'Donner un devoir'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Classe</label>
              <select value={classId} disabled={isEdit} onChange={e => setClassId(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white disabled:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">— Choisir —</option>
                {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Matière</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">— Aucune —</option>
                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex : Exercices chapitre 5"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Consignes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Décrivez le travail à faire…"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Date limite</label>
            <input type="date" value={dueDate} min={today()} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {/* Pièce jointe (si Cloudinary configuré) */}
          {uploadStatus?.enabled ? (
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Pièce jointe (optionnel)</label>
              {attachmentUrl ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-sm">
                  <Paperclip size={15} className="text-emerald-600" />
                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-emerald-700 hover:underline">{attachmentName}</a>
                  <button onClick={() => { setAttachmentUrl(''); setAttachmentName('') }} className="text-surface-400 hover:text-red-500"><X size={15} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-surface-300 text-surface-500 text-sm cursor-pointer hover:border-brand-300">
                  <FileUp size={16} /> {uploading ? 'Envoi en cours…' : 'Joindre un fichier'}
                  <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
                </label>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-50 text-surface-400 text-sm">
              <Paperclip size={16} /> Pièce jointe — activez Cloudinary pour l'utiliser
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending || update.isPending} onClick={submit}>{isEdit ? 'Enregistrer' : 'Publier le devoir'}</Button>
        </div>
      </div>
    </div>
  )
}

export default function TeacherHomework() {
  const [params, setParams] = useSearchParams()
  const [classId, setClassId] = useState('')
  const { data: homework, isLoading } = useTeacherHomework(classId)
  const { data: classes } = useAttendanceClasses()
  const del = useDeleteHomework()
  const [form, setForm] = useState(null)   // {} for new, homework obj for edit

  useEffect(() => { if (params.get('new') === '1') { setForm({}); setParams({}) } }, [params, setParams])

  const remove = async (id) => {
    if (!window.confirm('Supprimer ce devoir ?')) return
    try { await del.mutateAsync(id); toast.success('Devoir supprimé') } catch { toast.error('Échec de la suppression.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Devoirs</h1>
          <p className="text-surface-500 mt-1">Les devoirs que vous avez donnés</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setForm({})}>Donner un devoir</Button>
      </div>

      <select value={classId} onChange={e => setClassId(e.target.value)}
        className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        <option value="">Toutes les classes</option>
        {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {isLoading ? (
        <div className="flex justify-center h-60 items-center"><Spinner /></div>
      ) : homework?.length === 0 ? (
        <Card className="text-center py-12">
          <ClipboardList size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">Aucun devoir pour le moment</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {homework.map(h => (
            <Card key={h.id}>
              <div className="flex items-start gap-3">
                <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: h.color || '#6366f1' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-surface-900">{h.title}</h3>
                    <Badge variant={h.status === 'upcoming' ? 'info' : 'default'}>
                      {h.status === 'upcoming' ? 'À venir' : 'Échu'}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {h.className} · {h.subject || 'Sans matière'} · à rendre le {fmt(h.dueDate)}
                  </p>
                  {h.description && <p className="text-sm text-surface-600 mt-1.5 line-clamp-2">{h.description}</p>}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    {h.doneCount} / {h.totalStudents} élève(s) ont marqué comme fait
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setForm(h)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500"><Pencil size={15} /></button>
                  <button onClick={() => remove(h.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {form !== null && <HomeworkForm initial={form.id ? form : null} onClose={() => setForm(null)} />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { X, Trash2, CalendarDays, User } from 'lucide-react'
import {
  useTimetableMeta, useClassTimetable, useTeacherTimetable,
  useCreateSlot, useUpdateSlot, useDeleteSlot,
} from '@/hooks/useTimetable'
import TimetableGrid, { DAYS } from '@/components/TimetableGrid'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

// ── Modale de créneau (création / édition) ────────────────────
function SlotModal({ classId, meta, initial, onClose }) {
  const isEdit = !!initial?.id
  const create = useCreateSlot()
  const update = useUpdateSlot()
  const del = useDeleteSlot()

  const [subjectId, setSubjectId] = useState(initial?.subjectId || '')
  const [teacherId, setTeacherId] = useState(initial?.teacherId || '')
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek || 1)
  const [startTime, setStartTime] = useState(initial?.startTime || '08:00')
  const [endTime, setEndTime] = useState(initial?.endTime || '09:00')
  const [room, setRoom] = useState(initial?.room || '')

  const save = async () => {
    const payload = { classId, subjectId: subjectId || null, teacherId: teacherId || null, dayOfWeek, startTime, endTime, room }
    try {
      if (isEdit) { await update.mutateAsync({ id: initial.id, ...payload }); toast.success('Créneau modifié') }
      else { await create.mutateAsync(payload); toast.success('Créneau ajouté') }
      onClose()
    } catch (e) {
      toast.error(e?.response?.data?.error || "Échec de l'enregistrement.")
    }
  }

  const remove = async () => {
    if (!window.confirm('Supprimer ce créneau ?')) return
    try { await del.mutateAsync(initial.id); toast.success('Créneau supprimé'); onClose() }
    catch { toast.error('Échec de la suppression.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">{isEdit ? 'Modifier le créneau' : 'Ajouter un créneau'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Matière</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Aucune —</option>
              {meta.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Enseignant</label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Aucun —</option>
              {meta.teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Jour</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(parseInt(e.target.value))}
                className="w-full px-2 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                {DAYS.map(d => <option key={d.n} value={d.n}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Début</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-2 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">Fin</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full px-2 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-700 block mb-1.5">Salle</label>
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="ex : Salle 12"
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-surface-100">
          {isEdit
            ? <Button variant="ghost" icon={<Trash2 size={16} />} className="text-red-600" onClick={remove}>Supprimer</Button>
            : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button loading={create.isPending || update.isPending} onClick={save}>Enregistrer</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Édition par classe ────────────────────────────────────────
function ClassEditor({ meta }) {
  const [classId, setClassId] = useState('')
  useEffect(() => { if (!classId && meta.classes[0]) setClassId(meta.classes[0].id) }, [meta, classId])
  const { data: slots, isLoading } = useClassTimetable(classId)
  const [modal, setModal] = useState(null)   // { initial }

  return (
    <div className="space-y-4">
      <select value={classId} onChange={e => setClassId(e.target.value)}
        className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        {meta.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <Card padding={false} className="p-3">
        {isLoading ? (
          <div className="flex justify-center h-40 items-center"><Spinner /></div>
        ) : (
          <TimetableGrid
            slots={slots || []}
            mode="edit"
            onCellClick={(day, p) => setModal({ initial: { dayOfWeek: day, startTime: p.start, endTime: p.end } })}
            onSlotClick={(slot) => setModal({ initial: slot })}
          />
        )}
      </Card>

      {modal && <SlotModal classId={classId} meta={meta} initial={modal.initial} onClose={() => setModal(null)} />}
    </div>
  )
}

// ── Vue par enseignant ────────────────────────────────────────
function TeacherView({ meta }) {
  const [teacherId, setTeacherId] = useState('')
  useEffect(() => { if (!teacherId && meta.teachers[0]) setTeacherId(meta.teachers[0].id) }, [meta, teacherId])
  const { data: slots, isLoading } = useTeacherTimetable(teacherId)

  return (
    <div className="space-y-4">
      <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
        className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        {meta.teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
      </select>
      <Card padding={false} className="p-3">
        {isLoading ? (
          <div className="flex justify-center h-40 items-center"><Spinner /></div>
        ) : (slots && slots.length > 0) ? (
          <TimetableGrid slots={slots} mode="view-teacher" />
        ) : (
          <p className="text-center text-surface-500 text-sm py-10">Cet enseignant n'a aucun cours programmé.</p>
        )}
      </Card>
    </div>
  )
}

export default function DirectorTimetable() {
  const { data: meta, isLoading } = useTimetableMeta()
  const [tab, setTab] = useState('class')

  if (isLoading || !meta) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Emploi du temps</h1>
        <p className="text-surface-500 mt-1">Composez l'emploi du temps de chaque classe</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('class')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'class' ? 'bg-brand-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>
          <CalendarDays size={16} /> Par classe
        </button>
        <button onClick={() => setTab('teacher')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'teacher' ? 'bg-brand-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>
          <User size={16} /> Par enseignant
        </button>
      </div>

      {tab === 'class' ? <ClassEditor meta={meta} /> : <TeacherView meta={meta} />}
    </div>
  )
}

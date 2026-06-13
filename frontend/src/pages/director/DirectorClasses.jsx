import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Pencil, Trash2, Users, UserPlus, Star, BookOpen } from 'lucide-react'
import {
  useMgmtClasses, useCreateClass, useUpdateClass, useDeleteClass,
  useLevels, useCreateLevel, useAssignTeacher, useRemoveTeacher, useMgmtStaff,
} from '@/hooks/useManagement'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

function ClassModal({ initial, levels, onClose }) {
  const isEdit = !!initial?.id
  const create = useCreateClass()
  const update = useUpdateClass()
  const createLevel = useCreateLevel()
  const [f, setF] = useState({
    name: initial?.name || '', levelId: initial?.levelId || '',
    maxStudents: initial?.maxStudents || 40, room: initial?.room || '',
  })
  const [newLevel, setNewLevel] = useState('')
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  const addLevel = async () => {
    if (!newLevel.trim()) return
    try { const r = await createLevel.mutateAsync({ name: newLevel.trim(), orderIndex: (levels?.length || 0) + 1 }); setF(s => ({ ...s, levelId: r.id })); setNewLevel(''); toast.success('Niveau ajouté') }
    catch { toast.error('Échec.') }
  }
  const save = async () => {
    if (!f.name.trim()) { toast.error('Nom de la classe requis.'); return }
    try {
      if (isEdit) { await update.mutateAsync({ id: initial.id, ...f, maxStudents: parseInt(f.maxStudents) || 40 }); toast.success('Classe modifiée') }
      else { await create.mutateAsync({ ...f, maxStudents: parseInt(f.maxStudents) || 40 }); toast.success('Classe créée') }
      onClose()
    } catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">{isEdit ? 'Modifier la classe' : 'Nouvelle classe'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={f.name} onChange={set('name')} placeholder="Nom (ex : CM2 B)" className="input-mg w-full" />
          <div>
            <select value={f.levelId} onChange={set('levelId')} className="input-mg w-full">
              <option value="">— Niveau —</option>
              {levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              <input value={newLevel} onChange={e => setNewLevel(e.target.value)} placeholder="Nouveau niveau…" className="input-mg flex-1" />
              <Button variant="secondary" size="sm" onClick={addLevel} loading={createLevel.isPending}>Ajouter</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={f.maxStudents} onChange={set('maxStudents')} placeholder="Capacité" className="input-mg" />
            <input value={f.room} onChange={set('room')} placeholder="Salle" className="input-mg" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-surface-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button loading={create.isPending || update.isPending} onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </div>
  )
}

function TeacherPanel({ klass, teachers, onClose }) {
  const assign = useAssignTeacher()
  const remove = useRemoveTeacher()
  const [teacherId, setTeacherId] = useState('')
  const [isMain, setIsMain] = useState(false)

  const add = async () => {
    if (!teacherId) return
    try { await assign.mutateAsync({ classId: klass.id, teacherId, isMain }); setTeacherId(''); setIsMain(false); toast.success('Enseignant affecté') }
    catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }
  const rm = async (tid) => {
    try { await remove.mutateAsync({ classId: klass.id, teacherId: tid }) } catch { toast.error('Échec.') }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 className="font-semibold text-surface-900">Enseignants — {klass.name}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {klass.teachers.length === 0 ? (
            <p className="text-sm text-surface-500">Aucun enseignant affecté.</p>
          ) : klass.teachers.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-50">
              {t.isMain && <Star size={14} className="text-amber-500 fill-amber-500" />}
              <span className="flex-1 text-sm text-surface-900">{t.name}{t.isMain ? ' · Principal' : ''}</span>
              <button onClick={() => rm(t.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="pt-2 border-t border-surface-100 space-y-2">
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="input-mg w-full">
              <option value="">— Ajouter un enseignant —</option>
              {teachers.filter(t => !klass.teachers.some(kt => kt.id === t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-surface-600">
              <input type="checkbox" checked={isMain} onChange={e => setIsMain(e.target.checked)} /> Professeur principal
            </label>
            <Button size="sm" icon={<UserPlus size={15} />} onClick={add} loading={assign.isPending} className="w-full justify-center">Affecter</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DirectorClasses() {
  const { data: classes, isLoading } = useMgmtClasses()
  const { data: levels } = useLevels()
  const { data: staff } = useMgmtStaff()
  const del = useDeleteClass()
  const [modal, setModal] = useState(null)
  const [panel, setPanel] = useState(null)
  const teachers = (staff || []).filter(s => s.role === 'teacher' && s.isActive)

  const remove = async (c) => {
    if (!window.confirm(`Supprimer la classe ${c.name} ?`)) return
    try { await del.mutateAsync(c.id); toast.success('Classe supprimée') }
    catch (e) { toast.error(e?.response?.data?.error || 'Échec.') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <style>{`.input-mg{padding:.5rem .75rem;border:1px solid #e4e4e7;border-radius:.5rem;font-size:.875rem;background:#fff}.input-mg:focus{outline:none;box-shadow:0 0 0 2px #a5b4fc}`}</style>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">Classes</h1>
          <p className="text-surface-500 mt-1">{classes?.length || 0} classe(s)</p>
        </div>
        <Button size="lg" icon={<Plus size={18} />} onClick={() => setModal({})}>Nouvelle classe</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes?.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <BookOpen size={22} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900">{c.name}</p>
                    <p className="text-xs text-surface-500">{c.level || 'Sans niveau'}{c.room ? ` · ${c.room}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(c)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500"><Pencil size={14} /></button>
                  <button onClick={() => remove(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-surface-600 mb-3">
                <Users size={15} className="text-surface-400" />
                <span className="font-semibold text-surface-900">{c.students}</span> / {c.maxStudents} élèves
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                {c.teachers.map(t => (
                  <Badge key={t.id} variant={t.isMain ? 'primary' : 'default'}>{t.isMain && '★ '}{t.name}</Badge>
                ))}
              </div>
              <Button variant="secondary" size="sm" icon={<UserPlus size={14} />} onClick={() => setPanel(c)} className="w-full justify-center">
                Gérer les enseignants
              </Button>
            </Card>
          ))}
        </div>
      )}

      {modal && <ClassModal initial={modal.id ? modal : null} levels={levels} onClose={() => setModal(null)} />}
      {panel && <TeacherPanel klass={classes.find(c => c.id === panel.id) || panel} teachers={teachers} onClose={() => setPanel(null)} />}
    </div>
  )
}

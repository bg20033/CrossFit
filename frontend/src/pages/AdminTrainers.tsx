import { Dumbbell, Pencil, Trash2, Upload } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import TeamTabs from '../components/app/TeamTabs'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Trainer {
  id: number
  name: string
  email: string
  specialization: string
  hourlyRate: number
  isAvailable: boolean
  clientsCount?: number
  photoUrl?: string | null
  title?: string | null
  bio?: string | null
  workExperience?: string | null
  certifications?: string | null
  trainings?: string | null
}

const empty = {
  name: '',
  email: '',
  password: '',
  specialization: '',
  bio: '',
  hourlyRate: '0',
  title: '',
  workExperience: '',
  certifications: '',
  trainings: '',
}

const editEmpty = {
  specialization: '',
  title: '',
  bio: '',
  workExperience: '',
  certifications: '',
  trainings: '',
  hourlyRate: '0',
  isAvailable: true,
}

function photoSrc(url?: string | null) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '')
  return `${base}${url}`
}

export default function AdminTrainers() {
  const { addNotification } = useNotification()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  const [editing, setEditing] = useState<Trainer | null>(null)
  const [editForm, setEditForm] = useState(editEmpty)
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTrainers()
  }, [])

  const fetchTrainers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/trainers')
      setTrainers(res.data.trainers ?? [])
    } catch {
      setError('Ngarkimi i trajnerëve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/trainers/create', { ...form, hourlyRate: toDecimal(form.hourlyRate) })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Trajneri u krijua. Tash mund t\'i shtosh foton.', 'success')
      await fetchTrainers()
      // Foto kërkon ID ekzistuese të trajnerit — hap menjëherë modalin e modifikimit
      // që admini të vazhdojë në të njëjtin rrjedh, pa hap të dytë të veçantë.
      const newId = res.data?.id
      if (newId) {
        const created = await api.get(`/trainers/${newId}`)
        openEdit(created.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Krijimi i trajnerit dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const deactivate = async (trainer: Trainer) => {
    if (!confirm(`A je i sigurt që do ta çaktivizosh trajnerin ${trainer.name}?`)) return
    try {
      await api.delete(`/trainers/${trainer.id}`)
      addNotification('U çaktivizua', 'Trajneri u largua nga lista aktive.', 'success')
      fetchTrainers()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Çaktivizimi dështoi.', 'error')
    }
  }

  const openEdit = (trainer: Trainer) => {
    setEditing(trainer)
    setEditForm({
      specialization: trainer.specialization || '',
      title: trainer.title || '',
      bio: trainer.bio || '',
      workExperience: trainer.workExperience || '',
      certifications: trainer.certifications || '',
      trainings: trainer.trainings || '',
      hourlyRate: String(trainer.hourlyRate ?? 0),
      isAvailable: trainer.isAvailable,
    })
  }

  const editChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setEditForm((p) => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    try {
      await api.put(`/trainers/${editing.id}`, {
        specialization: editForm.specialization,
        title: editForm.title,
        bio: editForm.bio,
        workExperience: editForm.workExperience,
        certifications: editForm.certifications,
        trainings: editForm.trainings,
        hourlyRate: toDecimal(editForm.hourlyRate),
        isAvailable: editForm.isAvailable,
      })
      addNotification('Ruajtur', 'Profili i trajnerit u përditësua.', 'success')
      setEditing(null)
      fetchTrainers()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ruajtja dështoi.', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    if (!editing) return
    if (file.size > 5_000_000) {
      addNotification('Gabim', 'Foto s\'duhet me kalu 5MB.', 'error')
      return
    }
    setUploadingPhoto(true)
    try {
      const body = new FormData()
      body.append('file', file)
      // The shared `api` instance defaults to Content-Type: application/json, which
      // would make axios JSON-stringify this FormData instead of sending it as
      // multipart — Content-Type: false drops the header so the browser sets the
      // correct multipart/form-data boundary itself.
      const res = await api.post(`/trainers/${editing.id}/photo`, body, {
        headers: { 'Content-Type': false },
      })
      addNotification('Sukses', 'Foto u ngarkua.', 'success')
      setEditing((prev) => (prev ? { ...prev, photoUrl: res.data.photoUrl } : prev))
      fetchTrainers()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ngarkimi i fotos dështoi.', 'error')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Trajnerët"
        subtitle="Stafi i trajnimit, specializimet dhe disponueshmëria."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Trajner i ri'}
          </Button>
        }
      />

      <TeamTabs />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Shto trajner të ri">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri"><input name="name" value={form.name} onChange={change} required className={fieldCls} /></Field>
              <Field label="Email"><input type="email" name="email" value={form.email} onChange={change} required className={fieldCls} /></Field>
              <Field label="Fjalëkalimi"><input type="password" name="password" value={form.password} onChange={change} required minLength={8} className={fieldCls} /></Field>
              <Field label="Specializimi"><input name="specialization" value={form.specialization} onChange={change} placeholder="p.sh. CrossFit, Forcë" className={fieldCls} /></Field>
              <Field label="Tarifa/orë (€)"><input type="text" inputMode="decimal" name="hourlyRate" value={form.hourlyRate} onChange={change} className={fieldCls} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Titulli (p.sh. Trajner Kryesor)">
                <input name="title" value={form.title} onChange={change} className={fieldCls} />
              </Field>
              <Field label="Bio"><input name="bio" value={form.bio} onChange={change} className={fieldCls} /></Field>
            </div>
            <Field label="Përvoja e punës">
              <textarea name="workExperience" value={form.workExperience} onChange={change} rows={2} placeholder="p.sh. 8 vjet përvojë si trajner CrossFit" className={fieldCls} />
            </Field>
            <Field label="Çertifikatat">
              <textarea name="certifications" value={form.certifications} onChange={change} rows={2} placeholder="p.sh. CrossFit Level 2, Olympic Weightlifting Coach" className={fieldCls} />
            </Field>
            <Field label="Trajnimet">
              <textarea name="trainings" value={form.trainings} onChange={change} rows={2} placeholder="p.sh. Seminar mobiliteti 2025, Kurs ushqyerjeje sportive" className={fieldCls} />
            </Field>
            <p className="text-xs text-gray-400">
              Foton mund t'ia ngarkosh menjëherë pas krijimit — modali i modifikimit hapet automatikisht.
            </p>
            <Button type="submit" className={primaryBtn}>Krijo</Button>
          </form>
        </Panel>
      )}

      <Panel title="Lista e trajnerëve" action={<Badge accent="gray">{trainers.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : trainers.length === 0 ? (
          <EmptyState icon={<Dumbbell className="h-5 w-5" />} text="Ende s'ka trajnerë. Shto të parin me '+ Trajner i ri'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Emri</th>
                  <th className="px-3 py-2 font-semibold">Specializimi</th>
                  <th className="px-3 py-2 font-semibold">Tarifa/orë</th>
                  <th className="px-3 py-2 font-semibold">Klientë</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trainers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {photoSrc(t.photoUrl) ? (
                          <img src={photoSrc(t.photoUrl)!} alt={t.name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-400">
                            {t.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.title || t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{t.specialization || '—'}</td>
                    <td className="px-3 py-3 text-gray-800">{eur(t.hourlyRate)}</td>
                    <td className="px-3 py-3 text-gray-600">{t.clientsCount ?? 0}</td>
                    <td className="px-3 py-3"><Badge accent={t.isAvailable ? 'green' : 'gray'}>{t.isAvailable ? 'I lirë' : 'I zënë'}</Badge></td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Modifiko trajnerin"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deactivate(t)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Çaktivizo trajnerin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <Modal title={`Modifiko — ${editing.name}`} onClose={() => setEditing(null)}>
          <div className="mb-5 flex items-center gap-4">
            {photoSrc(editing.photoUrl) ? (
              <img src={photoSrc(editing.photoUrl)!} alt={editing.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-400">
                {editing.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingPhoto ? 'Duke ngarkuar…' : 'Ngarko foto'}
              </Button>
              <p className="mt-1 text-xs text-gray-400">JPG, PNG a WEBP, deri 5MB. Shfaqet te landing.</p>
            </div>
          </div>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Specializimi">
                <input name="specialization" value={editForm.specialization} onChange={editChange} className={fieldCls} />
              </Field>
              <Field label="Titulli (p.sh. Trajner Kryesor)">
                <input name="title" value={editForm.title} onChange={editChange} className={fieldCls} />
              </Field>
            </div>
            <Field label="Bio">
              <textarea name="bio" value={editForm.bio} onChange={editChange} rows={2} className={fieldCls} />
            </Field>
            <Field label="Përvoja e punës">
              <textarea name="workExperience" value={editForm.workExperience} onChange={editChange} rows={2} placeholder="p.sh. 8 vjet përvojë si trajner CrossFit" className={fieldCls} />
            </Field>
            <Field label="Çertifikatat">
              <textarea name="certifications" value={editForm.certifications} onChange={editChange} rows={2} placeholder="p.sh. CrossFit Level 2, Olympic Weightlifting Coach" className={fieldCls} />
            </Field>
            <Field label="Trajnimet">
              <textarea name="trainings" value={editForm.trainings} onChange={editChange} rows={2} placeholder="p.sh. Seminar mobiliteti 2025, Kurs ushqyerjeje sportive" className={fieldCls} />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <Field label="Tarifa/orë (€)">
                <input type="text" inputMode="decimal" name="hourlyRate" value={editForm.hourlyRate} onChange={editChange} className={fieldCls} />
              </Field>
              <label className="flex items-center gap-2 pt-6 text-sm font-medium text-gray-700">
                <input type="checkbox" name="isAvailable" checked={editForm.isAvailable} onChange={editChange} className="h-4 w-4 rounded border-gray-300" />
                Në dispozicion
              </label>
            </div>
            <Button type="submit" className={primaryBtn} disabled={savingEdit}>
              {savingEdit ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
            </Button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}

import { CalendarDays, Hourglass, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
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

interface Member {
  id: number
  name: string
  email: string
}
interface GroupDetail {
  id: number
  name: string
  members: Member[]
  waitlist: WaitlistEntry[]
}

interface Group {
  id: number
  name: string
  description?: string
  dayOfWeek: string
  scheduleStart: string
  scheduleEnd: string
  maxCapacity: number
  membersCount: number
  waitlistCount: number
}

interface WaitlistEntry {
  id: number
  clientId: number
  name: string
  requestedAt: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}
const empty = { name: '', description: '', dayOfWeek: 'Monday', scheduleStart: '18:00', scheduleEnd: '19:30', maxCapacity: '15' }

function hhmm(v?: string): string {
  if (!v) return ''
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return v.slice(0, 5)
}

export default function TrainerGroups() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [newMemberId, setNewMemberId] = useState('')

  const openDetail = async (groupId: number) => {
    try {
      const res = await api.get(`/traininggroups/${groupId}`)
      setDetail({
        id: res.data.id,
        name: res.data.name,
        members: res.data.members ?? [],
        waitlist: res.data.waitlist ?? [],
      })
    } catch {
      addNotification('Gabim', 'Hapja e grupit dështoi.', 'error')
    }
  }

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail) return
    try {
      const res = await api.post(`/traininggroups/${detail.id}/add-member`, { clientId: parseInt(newMemberId) })
      setNewMemberId('')
      addNotification('Sukses', res.data?.waitlisted ? 'Grupi është plot; klienti u fut në waitlist.' : 'Anëtari u shtua.', 'success')
      openDetail(detail.id)
      fetchGroups()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || err.response?.data || 'Shtimi dështoi.', 'error')
    }
  }

  const removeMember = async (clientId: number) => {
    if (!detail) return
    try {
      await api.post(`/traininggroups/${detail.id}/remove-member`, { clientId })
      addNotification('Ruajtur', 'Anëtari u largua; waitlist u kontrollua automatikisht.', 'success')
      openDetail(detail.id)
      fetchGroups()
    } catch {
      addNotification('Gabim', 'Largimi i anëtarit dështoi.', 'error')
    }
  }

  const promoteWaitlist = async () => {
    if (!detail) return
    try {
      const res = await api.post(`/traininggroups/${detail.id}/waitlist/promote`)
      addNotification('Waitlist', res.data?.promoted ? 'Klienti i radhës u promovua.' : 'S’ka vend të lirë ose waitlist është bosh.', res.data?.promoted ? 'success' : 'info')
      openDetail(detail.id)
      fetchGroups()
    } catch {
      addNotification('Gabim', 'Promovimi nga waitlist dështoi.', 'error')
    }
  }

  const recordAttendance = async (clientId: number, isPresent: boolean) => {
    if (!detail) return
    try {
      await api.post(`/traininggroups/${detail.id}/record-attendance`, { clientId, isPresent })
      addNotification('Ruajtur', isPresent ? 'Shënuar prezent.' : 'Shënuar mungesë.', 'success')
    } catch {
      addNotification('Gabim', 'Regjistrimi i prezencës dështoi.', 'error')
    }
  }

  const batchCheckIn = async (isPresent: boolean) => {
    if (!detail || detail.members.length === 0) return
    try {
      const res = await api.post('/attendance/batch', {
        groupId: detail.id,
        isPresent,
        clientIds: detail.members.map((m) => m.id),
      })
      const n = (res.data?.added ?? 0) + (res.data?.updated ?? 0)
      addNotification('Prezenca', `${n} anëtarë u shënuan ${isPresent ? 'prezent' : 'mungesë'}.`, 'success')
    } catch {
      addNotification('Gabim', 'Check-in në grup dështoi.', 'error')
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [profileId])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const q = profileId ? `?trainerId=${profileId}` : ''
      const res = await api.get(`/traininggroups${q}`)
      setGroups(res.data || [])
    } catch {
      setError('Ngarkimi i grupeve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const now = new Date()
      const [sh, sm] = form.scheduleStart.split(':')
      const [eh, em] = form.scheduleEnd.split(':')
      await api.post('/traininggroups/create', {
        trainerId: profileId ?? 1,
        name: form.name,
        description: form.description,
        dayOfWeek: form.dayOfWeek,
        scheduleStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), +sh, +sm),
        scheduleEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), +eh, +em),
        maxCapacity: parseInt(form.maxCapacity),
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Grupi u krijua.', 'success')
      fetchGroups()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Krijimi i grupit dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Trajner"
        title="Grupet e Trajnimit"
        subtitle="Krijo dhe menaxho grupet e tua të CrossFit-it."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Grup i ri'}
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>
      )}

      {showForm && (
        <Panel title="Krijo grup të ri">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri i grupit">
                <input name="name" value={form.name} onChange={change} required placeholder="p.sh. CrossFit Beginners" className={fieldCls} />
              </Field>
              <Field label="Dita e javës">
                <select name="dayOfWeek" value={form.dayOfWeek} onChange={change} className={fieldCls}>
                  {DAYS.map((d) => <option key={d} value={d}>{DAY_AL[d]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Përshkrimi">
              <textarea name="description" value={form.description} onChange={change} rows={2} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Ora e fillimit">
                <input type="time" name="scheduleStart" value={form.scheduleStart} onChange={change} className={fieldCls} />
              </Field>
              <Field label="Ora e mbarimit">
                <input type="time" name="scheduleEnd" value={form.scheduleEnd} onChange={change} className={fieldCls} />
              </Field>
              <Field label="Kapaciteti max">
                <input type="number" min="1" name="maxCapacity" value={form.maxCapacity} onChange={change} className={fieldCls} />
              </Field>
            </div>
            <Button type="submit" className={primaryBtn}>Krijo grupin</Button>
          </form>
        </Panel>
      )}

      <Panel title="Grupet e mia" action={<Badge accent="green">{groups.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Ende s'ke grupe. Krijo të parin me '+ Grup i ri'." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const full = (g.membersCount ?? 0) >= (g.maxCapacity ?? Infinity)
              return (
                <div key={g.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{g.name}</h3>
                    <Badge accent={full ? 'gray' : 'green'}>{g.membersCount ?? 0}/{g.maxCapacity}</Badge>
                  </div>
                  {(g.waitlistCount ?? 0) > 0 && (
                    <div className="mt-3">
                      <Badge>{g.waitlistCount} në pritje</Badge>
                    </div>
                  )}
                  {g.description && <p className="mt-1 text-sm text-gray-500">{g.description}</p>}
                  <div className="mt-4 space-y-1 text-sm text-gray-600">
                    <p><span className="text-gray-400">Dita:</span> {DAY_AL[g.dayOfWeek] ?? g.dayOfWeek}</p>
                    <p><span className="text-gray-400">Ora:</span> {hhmm(g.scheduleStart)} – {hhmm(g.scheduleEnd)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => openDetail(g.id)}>
                    Anëtarët & Prezenca
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {detail && (
        <Modal title={`Anëtarët — ${detail.name}`} onClose={() => setDetail(null)}>
          <form onSubmit={addMember} className="mb-4 flex items-end gap-2">
            <div className="flex-1">
              <Field label="Shto anëtar (Client ID)">
                <input type="number" value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} required className={fieldCls} />
              </Field>
            </div>
            <Button type="submit" className={primaryBtn}>Shto</Button>
          </form>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-900">Anëtarët</h4>
                <div className="flex items-center gap-2">
                  {detail.members.length > 0 && (
                    <>
                      <Button size="sm" className={primaryBtn} onClick={() => batchCheckIn(true)}>Të gjithë prezent</Button>
                      <Button size="sm" variant="outline" onClick={() => batchCheckIn(false)}>Të gjithë mungesë</Button>
                    </>
                  )}
                  <Badge>{detail.members.length}</Badge>
                </div>
              </div>
              {detail.members.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />} text="Ende s'ka anëtarë në këtë grup." />
              ) : (
                <div className="space-y-2">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className={primaryBtn} onClick={() => recordAttendance(m.id, true)}>Prezent</Button>
                        <Button size="sm" variant="outline" onClick={() => recordAttendance(m.id, false)}>Mungesë</Button>
                        <Button size="sm" variant="outline" onClick={() => removeMember(m.id)}>Largo</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Waitlist</h4>
                <div className="flex items-center gap-2">
                  <Badge>{detail.waitlist.length}</Badge>
                  <Button size="sm" variant="outline" onClick={promoteWaitlist} disabled={detail.waitlist.length === 0}>Promovo</Button>
                </div>
              </div>
              {detail.waitlist.length === 0 ? (
                <EmptyState icon={<Hourglass className="h-5 w-5" />} text="S'ka klientë në pritje për këtë grup." />
              ) : (
                <div className="space-y-2">
                  {detail.waitlist.map((w, index) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{index + 1}. {w.name}</p>
                        <p className="text-xs text-gray-400">Client ID: {w.clientId}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(w.requestedAt).toLocaleDateString('sq-AL')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}

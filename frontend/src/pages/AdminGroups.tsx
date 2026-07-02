import { BarChart3, CalendarClock, CalendarDays, Hourglass, Plus, Search, Trash2, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
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

interface Slot {
  dayOfWeek: string
  startMin: number
  endMin: number
}
interface Group {
  id: number
  name: string
  description?: string
  trainerId: number
  trainer: string
  slots: Slot[]
  maxCapacity: number
  membersCount: number
  waitlistCount: number
}
interface Trainer {
  id: number
  name: string
}
interface Member {
  id: number
  name: string
  email: string
}
interface WaitlistEntry {
  id: number
  clientId: number
  name: string
  requestedAt: string
}
interface GroupDetail {
  id: number
  name: string
  maxCapacity: number
  membersCount: number
  members: Member[]
  waitlist: WaitlistEntry[]
}
interface ClientLite {
  id: number
  name: string
  email: string
  membershipType?: string
  trainer?: string | null
  isActive: boolean
}
interface Session {
  id: number
  trainingGroupId: number
  date: string
  dayOfWeek: string
  startMin: number
  endMin: number
  status: string
  reason?: string
  postponedToDate?: string
  substituteTrainerId?: number | null
  substituteTrainer?: string | null
  trainerCheckedIn: boolean
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}
const DAY_SHORT: Record<string, string> = {
  Monday: 'Hën', Tuesday: 'Mar', Wednesday: 'Mër', Thursday: 'Enj',
  Friday: 'Pre', Saturday: 'Sht', Sunday: 'Die',
}
const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']
const STATUS_AL: Record<string, string> = {
  scheduled: 'Planifikuar', held: 'Mbajtur', cancelled: 'Anuluar', postponed: 'Shtyrë',
}

const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const hhmmToMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

interface SlotForm {
  dayOfWeek: string
  start: string
  end: string
}
const newSlot = (): SlotForm => ({ dayOfWeek: 'Monday', start: '18:00', end: '19:30' })
const emptyForm = () => ({ id: 0, name: '', description: '', trainerId: '', maxCapacity: '15', slots: [newSlot()] })
type Form = ReturnType<typeof emptyForm>

export default function AdminGroups() {
  const navigate = useNavigate()
  const { addNotification } = useNotification()
  const [groups, setGroups] = useState<Group[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm())

  // member management
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [allClients, setAllClients] = useState<ClientLite[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [onlyNoGroup, setOnlyNoGroup] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)

  // sessions management
  const now = new Date()
  const [sessGroup, setSessGroup] = useState<Group | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessPeriod, setSessPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [sessLoading, setSessLoading] = useState(false)

  useEffect(() => {
    fetchGroups()
    api
      .get('/trainers?pageSize=100')
      .then((r) => setTrainers(r.data?.trainers ?? []))
      .catch(() => setTrainers([]))
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const res = await api.get('/traininggroups')
      setGroups(res.data || [])
    } catch {
      setError('Ngarkimi i grupeve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setForm({ ...emptyForm(), trainerId: trainers[0] ? String(trainers[0].id) : '' })
    setShowForm(true)
  }

  const openEdit = (g: Group) => {
    setForm({
      id: g.id,
      name: g.name,
      description: g.description ?? '',
      trainerId: String(g.trainerId),
      maxCapacity: String(g.maxCapacity),
      slots: g.slots.length
        ? g.slots.map((s) => ({ dayOfWeek: s.dayOfWeek, start: minToHHMM(s.startMin), end: minToHHMM(s.endMin) }))
        : [newSlot()],
    })
    setShowForm(true)
  }

  const addSlotRow = () => setForm((f) => ({ ...f, slots: [...f.slots, newSlot()] }))
  const removeSlotRow = (i: number) =>
    setForm((f) => ({ ...f, slots: f.slots.length > 1 ? f.slots.filter((_, idx) => idx !== i) : f.slots }))
  const changeSlot = (i: number, key: keyof SlotForm, value: string) =>
    setForm((f) => ({ ...f, slots: f.slots.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.trainerId) {
      setError('Zgjedh një trajner për grupin.')
      return
    }
    for (const s of form.slots) {
      if (hhmmToMin(s.start) >= hhmmToMin(s.end)) {
        setError('Çdo terminë duhet të ketë orën e fillimit para mbarimit.')
        return
      }
    }
    const body = {
      trainerId: parseInt(form.trainerId),
      name: form.name,
      description: form.description,
      maxCapacity: parseInt(form.maxCapacity),
      slots: form.slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startMin: hhmmToMin(s.start), endMin: hhmmToMin(s.end) })),
    }
    try {
      if (form.id) {
        await api.put(`/traininggroups/${form.id}`, body)
        addNotification('Ruajtur', 'Grupi u përditësua.', 'success')
      } else {
        await api.post('/traininggroups/create', body)
        addNotification('Sukses', 'Grupi u krijua.', 'success')
      }
      setShowForm(false)
      setForm(emptyForm())
      fetchGroups()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ruajtja e grupit dështoi')
    }
  }

  // ---- members ----
  const openDetail = async (groupId: number) => {
    try {
      const [gRes, cRes] = await Promise.all([
        api.get(`/traininggroups/${groupId}`),
        api.get('/clients?pageSize=300&status=active'),
      ])
      setDetail({
        id: gRes.data.id,
        name: gRes.data.name,
        maxCapacity: gRes.data.maxCapacity,
        membersCount: (gRes.data.members ?? []).length,
        members: gRes.data.members ?? [],
        waitlist: gRes.data.waitlist ?? [],
      })
      setAllClients(cRes.data?.clients ?? [])
      setClientSearch('')
      setOnlyNoGroup(false)
      setSelected(new Set())
    } catch {
      addNotification('Gabim', 'Hapja e grupit dështoi.', 'error')
    }
  }

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const addSelected = async () => {
    if (!detail || selected.size === 0) return
    setAdding(true)
    let ok = 0
    let waitlisted = 0
    for (const id of selected) {
      try {
        const res = await api.post(`/traininggroups/${detail.id}/add-member`, { clientId: id })
        if (res.data?.waitlisted) waitlisted++
        else ok++
      } catch {
        /* skip individual failures */
      }
    }
    setAdding(false)
    addNotification(
      'Sukses',
      `${ok} anëtar(ë) u shtuan${waitlisted ? `, ${waitlisted} në waitlist` : ''}.`,
      'success'
    )
    openDetail(detail.id)
    fetchGroups()
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

  const memberIds = new Set(detail?.members.map((m) => m.id) ?? [])
  const pickList = allClients
    .filter((c) => !memberIds.has(c.id))
    .filter((c) => (onlyNoGroup ? !c.trainer : true))
    .filter((c) => {
      const q = clientSearch.trim().toLowerCase()
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    })

  // ---- sessions ----
  const openSessions = (g: Group) => {
    setSessGroup(g)
    loadSessions(g.id, sessPeriod.year, sessPeriod.month)
  }

  const loadSessions = async (groupId: number, year: number, month: number) => {
    setSessLoading(true)
    try {
      const res = await api.get(`/groupsessions?groupId=${groupId}&year=${year}&month=${month}`)
      setSessions(res.data ?? [])
    } catch {
      addNotification('Gabim', 'Ngarkimi i seancave dështoi.', 'error')
    } finally {
      setSessLoading(false)
    }
  }

  const changeSessPeriod = (patch: Partial<typeof sessPeriod>) => {
    const next = { ...sessPeriod, ...patch }
    setSessPeriod(next)
    if (sessGroup) loadSessions(sessGroup.id, next.year, next.month)
  }

  const generateSessions = async () => {
    if (!sessGroup) return
    try {
      const res = await api.post('/groupsessions/generate', {
        groupId: sessGroup.id,
        year: sessPeriod.year,
        month: sessPeriod.month,
      })
      addNotification('Sukses', res.data?.message || 'Seancat u gjeneruan.', 'success')
      loadSessions(sessGroup.id, sessPeriod.year, sessPeriod.month)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Gjenerimi dështoi.', 'error')
    }
  }

  const cancelSession = async (s: Session) => {
    const reason = window.prompt('Arsyeja e anulimit (opsionale):') ?? ''
    try {
      await api.post(`/groupsessions/${s.id}/cancel`, { reason })
      loadSessions(s.trainingGroupId, sessPeriod.year, sessPeriod.month)
    } catch {
      addNotification('Gabim', 'Anulimi dështoi.', 'error')
    }
  }

  const postponeSession = async (s: Session) => {
    const d = window.prompt('Shtyje për datën (VVVV-MM-DD):', s.date.slice(0, 10))
    if (!d) return
    try {
      await api.post(`/groupsessions/${s.id}/postpone`, { newDate: d, reason: '' })
      loadSessions(s.trainingGroupId, sessPeriod.year, sessPeriod.month)
    } catch {
      addNotification('Gabim', 'Shtyrja dështoi.', 'error')
    }
  }

  const markHeld = async (s: Session) => {
    try {
      await api.post(`/groupsessions/${s.id}/mark-held`)
      loadSessions(s.trainingGroupId, sessPeriod.year, sessPeriod.month)
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  const resetSession = async (s: Session) => {
    try {
      await api.post(`/groupsessions/${s.id}/reset`)
      loadSessions(s.trainingGroupId, sessPeriod.year, sessPeriod.month)
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  const heldCount = sessions.filter((s) => s.status === 'held').length

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Administrator"
        title="Grupet e Trajnimit"
        subtitle="Konfiguro grupet, cakto trajnerin, orarin javor dhe menaxho seancat e muajit."
        right={<Button onClick={openCreate} className={primaryBtn}>+ Grup i ri</Button>}
      />

      {error && !showForm && (
        <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>
      )}

      <Panel title="Të gjitha grupet" action={<Badge accent="green">{groups.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Ende s'ka grupe. Krijo të parin me '+ Grup i ri'." />
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
                  <p className="mt-1 text-sm text-gray-500">Trajner: {g.trainer}</p>
                  {g.description && <p className="mt-1 text-sm text-gray-500">{g.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {g.slots.length === 0 ? (
                      <span className="text-xs text-gray-400">Pa orar</span>
                    ) : (
                      g.slots.map((s, i) => (
                        <span key={i} className="rounded-lg bg-coral-50 px-2 py-1 text-[11px] font-medium text-coral-700">
                          {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek} {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
                        </span>
                      ))
                    )}
                  </div>
                  {(g.waitlistCount ?? 0) > 0 && (
                    <div className="mt-3"><Badge>{g.waitlistCount} në pritje</Badge></div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>Konfiguro</Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(g.id)}>Anëtarët</Button>
                    <Button size="sm" variant="outline" onClick={() => openSessions(g)}>Seancat</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/group-report/${g.id}`)}>
                      <BarChart3 className="mr-1 h-3.5 w-3.5" /> Raport
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {showForm && (
        <Modal title={form.id ? 'Konfiguro grupin' : 'Krijo grup të ri'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri i grupit">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="p.sh. CrossFit Beginners" className={fieldCls} />
              </Field>
              <Field label="Trajneri">
                <select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} required className={fieldCls}>
                  <option value="" disabled>Zgjedh trajnerin…</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Përshkrimi">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={fieldCls} />
            </Field>
            <Field label="Kapaciteti max">
              <input type="number" min="1" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} className={fieldCls} />
            </Field>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">Orari javor (përsëritet çdo javë)</label>
                <Button type="button" size="sm" variant="outline" onClick={addSlotRow}>
                  <Plus className="mr-1 h-4 w-4" /> Terminë
                </Button>
              </div>
              <div className="space-y-2">
                {form.slots.map((s, i) => (
                  <div key={i} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-[1fr_auto_auto_auto]">
                    <select value={s.dayOfWeek} onChange={(e) => changeSlot(i, 'dayOfWeek', e.target.value)} className={fieldCls}>
                      {DAYS.map((d) => <option key={d} value={d}>{DAY_AL[d]}</option>)}
                    </select>
                    <input type="time" value={s.start} onChange={(e) => changeSlot(i, 'start', e.target.value)} className={fieldCls} />
                    <input type="time" value={s.end} onChange={(e) => changeSlot(i, 'end', e.target.value)} className={fieldCls} />
                    <button
                      type="button"
                      onClick={() => removeSlotRow(i)}
                      disabled={form.slots.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-coral-600 disabled:opacity-30"
                      aria-label="Largo terminën"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Anulo</Button>
              <Button type="submit" className={primaryBtn}>{form.id ? 'Ruaj ndryshimet' : 'Krijo grupin'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={`Anëtarët — ${detail.name}`} onClose={() => setDetail(null)}>
          <div className="space-y-5">
            {/* Searchable multi-select picker */}
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Shto anëtarë</h4>
                <Badge accent={detail.membersCount >= detail.maxCapacity ? 'gray' : 'green'}>
                  {detail.membersCount}/{detail.maxCapacity}
                </Badge>
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Kërko me emër ose email…"
                  className={`${fieldCls} pl-9`}
                />
              </div>
              <label className="mb-2 flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={onlyNoGroup} onChange={(e) => setOnlyNoGroup(e.target.checked)} />
                Vetëm klientë pa trajner
              </label>
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {pickList.length === 0 ? (
                  <p className="py-3 text-center text-xs text-gray-400">S'u gjet asnjë klient.</p>
                ) : (
                  pickList.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                    >
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="truncate text-xs text-gray-400">{c.email}{c.trainer ? ` · ${c.trainer}` : ''}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" className={primaryBtn} disabled={selected.size === 0 || adding} onClick={addSelected}>
                  {adding ? 'Duke shtuar…' : `Shto të zgjedhurit (${selected.size})`}
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Anëtarët</h4>
                <Badge>{detail.members.length}</Badge>
              </div>
              {detail.members.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />} text="Ende s'ka anëtarë në këtë grup." />
              ) : (
                <div className="space-y-2">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeMember(m.id)}>Largo</Button>
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
                        <p className="text-xs text-gray-400">ID: {w.clientId}</p>
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

      {sessGroup && (
        <Modal title={`Seancat — ${sessGroup.name}`} onClose={() => setSessGroup(null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <Field label="Muaji">
                  <select value={sessPeriod.month} onChange={(e) => changeSessPeriod({ month: parseInt(e.target.value) })} className={fieldCls}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <div className="w-24">
                <Field label="Viti">
                  <input type="number" value={sessPeriod.year} onChange={(e) => changeSessPeriod({ year: parseInt(e.target.value) || sessPeriod.year })} className={fieldCls} />
                </Field>
              </div>
              <Button className={primaryBtn} onClick={generateSessions}>
                <CalendarClock className="mr-1 h-4 w-4" /> Gjenero seancat
              </Button>
              <Badge accent="green">{heldCount} mbajtur</Badge>
            </div>

            {sessLoading ? (
              <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                text="S'ka seanca për këtë muaj. Shtyp 'Gjenero seancat' për t'i krijuar nga orari javor."
              />
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(s.date).toLocaleDateString('sq-AL', { weekday: 'short', day: '2-digit', month: 'short' })}{' '}
                          {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {STATUS_AL[s.status] ?? s.status}
                          {s.trainerCheckedIn ? ' · trajneri u skanua' : ''}
                          {s.substituteTrainer ? ` · zëvendësim: ${s.substituteTrainer}` : ''}
                          {s.reason ? ` · ${s.reason}` : ''}
                        </p>
                      </div>
                      <Badge accent={s.status === 'held' ? 'green' : 'gray'}>{STATUS_AL[s.status] ?? s.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.status !== 'held' && (
                        <Button size="sm" variant="outline" onClick={() => markHeld(s)}>Mbajtur</Button>
                      )}
                      {s.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={() => cancelSession(s)}>Anulo</Button>
                      )}
                      {s.status !== 'postponed' && (
                        <Button size="sm" variant="outline" onClick={() => postponeSession(s)}>Shtyje</Button>
                      )}
                      {(s.status === 'cancelled' || s.status === 'postponed') && (
                        <Button size="sm" variant="outline" onClick={() => resetSession(s)}>Rikthe</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Komisioni i trajnerit llogaritet nga seancat e mbajtura këtë muaj. Gjenero dhe shëno seancat para se të paguash.
            </p>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}

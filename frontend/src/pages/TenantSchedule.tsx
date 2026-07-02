import { useEffect, useState } from 'react'
import { CalendarClock, CalendarDays, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { DashboardHeader, DashboardShell, EmptyState, Panel, Field, fieldCls, Badge, Skeleton, primaryBtn } from '../components/DashboardKit'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'

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

interface Slot {
  dayOfWeek: string
  startMin: number
  endMin: number
}
interface SlotForm {
  dayOfWeek: string
  start: string
  end: string
}
const newSlot = (): SlotForm => ({ dayOfWeek: 'Monday', start: '18:00', end: '19:30' })

interface Session {
  id: number
  date: string
  dayOfWeek: string
  startMin: number
  endMin: number
  status: string
  reason?: string
  postponedToDate?: string
}

export default function TenantSchedule() {
  const { addNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])

  // edit form
  const [editing, setEditing] = useState(false)
  const [formName, setFormName] = useState('')
  const [formSlots, setFormSlots] = useState<SlotForm[]>([newSlot()])
  const [saving, setSaving] = useState(false)

  // sessions / calendar
  const now = new Date()
  const [sessions, setSessions] = useState<Session[]>([])
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [sessLoading, setSessLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/rentals/tenant/schedule')
      setName(res.data?.businessName ?? res.data?.BusinessName ?? '')
      setSlots(Array.isArray(res.data?.slots) ? res.data.slots : [])
    } catch (err: any) {
      setSlots([])
      setError(err.response?.data?.message || 'Orari nuk u ngarkua nga DB.')
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async (year: number, month: number) => {
    setSessLoading(true)
    try {
      const res = await api.get(`/rentalsessions?year=${year}&month=${month}`)
      setSessions(res.data ?? [])
    } catch {
      addNotification('Gabim', 'Ngarkimi i seancave dështoi.', 'error')
    } finally {
      setSessLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadSessions(period.year, period.month)
  }, [])

  const changePeriod = (patch: Partial<typeof period>) => {
    const next = { ...period, ...patch }
    setPeriod(next)
    loadSessions(next.year, next.month)
  }

  const openEdit = () => {
    setFormName(name)
    setFormSlots(
      slots.length
        ? slots.map((s) => ({ dayOfWeek: s.dayOfWeek, start: minToHHMM(s.startMin), end: minToHHMM(s.endMin) }))
        : [newSlot()]
    )
    setEditing(true)
  }

  const addSlotRow = () => setFormSlots((f) => [...f, newSlot()])
  const removeSlotRow = (i: number) => setFormSlots((f) => (f.length > 1 ? f.filter((_, idx) => idx !== i) : f))
  const changeSlot = (i: number, key: keyof SlotForm, value: string) =>
    setFormSlots((f) => f.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    for (const s of formSlots) {
      if (hhmmToMin(s.start) >= hhmmToMin(s.end)) {
        setError('Çdo terminë duhet të ketë orën e fillimit para mbarimit.')
        return
      }
    }
    setSaving(true)
    try {
      await api.put('/rentals/tenant/schedule', {
        name: formName,
        slots: formSlots.map((s) => ({ dayOfWeek: s.dayOfWeek, startMin: hhmmToMin(s.start), endMin: hhmmToMin(s.end) })),
      })
      addNotification('Ruajtur', 'Orari u konfigurua.', 'success')
      setEditing(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ruajtja e orarit dështoi.')
    } finally {
      setSaving(false)
    }
  }

  const generateSessions = async () => {
    try {
      const res = await api.post('/rentalsessions/generate', { year: period.year, month: period.month })
      addNotification('Sukses', res.data?.message || 'Seancat u gjeneruan.', 'success')
      loadSessions(period.year, period.month)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Gjenerimi dështoi.', 'error')
    }
  }

  const cancelSession = async (s: Session) => {
    const reason = window.prompt('Arsyeja e anulimit (opsionale):') ?? ''
    try {
      await api.post(`/rentalsessions/${s.id}/cancel`, { reason })
      loadSessions(period.year, period.month)
    } catch {
      addNotification('Gabim', 'Anulimi dështoi.', 'error')
    }
  }

  const postponeSession = async (s: Session) => {
    const d = window.prompt('Shtyje për datën (VVVV-MM-DD):', s.date.slice(0, 10))
    if (!d) return
    try {
      await api.post(`/rentalsessions/${s.id}/postpone`, { newDate: d, reason: '' })
      loadSessions(period.year, period.month)
    } catch {
      addNotification('Gabim', 'Shtyrja dështoi.', 'error')
    }
  }

  const markHeld = async (s: Session) => {
    try {
      await api.post(`/rentalsessions/${s.id}/mark-held`)
      loadSessions(period.year, period.month)
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  const resetSession = async (s: Session) => {
    try {
      await api.post(`/rentalsessions/${s.id}/reset`)
      loadSessions(period.year, period.month)
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Qiragji"
        title="Orari im"
        subtitle="Jep emrin, kohën, sa zgjat dhe sa herë në javë — krejt tjetrën e konfiguron sistemi."
        right={<Button onClick={openEdit} className={primaryBtn}>{slots.length ? 'Konfiguro orarin' : '+ Konfiguro orarin'}</Button>}
      />

      <Panel title="Hapësira ime">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : error && slots.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text={error} />
        ) : slots.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="S'ke orar të konfiguruar ende. Shtyp 'Konfiguro orarin' dhe jep emrin + terminet javore." />
        ) : (
          <div>
            <p className="mb-3 text-lg font-semibold text-gray-900">{name || 'Hapësira ime'}</p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s, i) => (
                <span key={i} className="rounded-lg bg-coral-50 px-2.5 py-1.5 text-xs font-medium text-coral-700">
                  {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek} {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Seancat"
        action={
          <div className="flex items-center gap-2">
            <select
              value={period.month}
              onChange={(e) => changePeriod({ month: parseInt(e.target.value) })}
              className={`${fieldCls} w-24`}
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              value={period.year}
              onChange={(e) => changePeriod({ year: parseInt(e.target.value) || period.year })}
              className={`${fieldCls} w-20`}
            />
            <Button size="sm" className={primaryBtn} onClick={generateSessions} disabled={slots.length === 0}>
              <CalendarClock className="mr-1 h-4 w-4" /> Gjenero
            </Button>
          </div>
        }
      >
        {sessLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            text="S'ka seanca për këtë muaj. Konfiguro orarin dhe shtyp 'Gjenero'."
          />
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
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
                      {s.reason ? ` · ${s.reason}` : ''}
                    </p>
                  </div>
                  <Badge accent={s.status === 'held' ? 'green' : 'gray'}>{STATUS_AL[s.status] ?? s.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.status !== 'held' && <Button size="sm" variant="outline" onClick={() => markHeld(s)}>Mbajtur</Button>}
                  {s.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => cancelSession(s)}>Anulo</Button>}
                  {s.status !== 'postponed' && <Button size="sm" variant="outline" onClick={() => postponeSession(s)}>Shtyje</Button>}
                  {(s.status === 'cancelled' || s.status === 'postponed') && (
                    <Button size="sm" variant="outline" onClick={() => resetSession(s)}>Rikthe</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Konfiguro hapësirën time</h3>
            <form onSubmit={save} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>
              )}
              <Field label="Emri i hapësirës">
                <input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="p.sh. Studio e Ardit" className={fieldCls} />
              </Field>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-gray-700">Orari javor (sa herë në javë, koha, kohëzgjatja)</label>
                  <Button type="button" size="sm" variant="outline" onClick={addSlotRow}>
                    <Plus className="mr-1 h-4 w-4" /> Terminë
                  </Button>
                </div>
                <div className="space-y-2">
                  {formSlots.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-[1fr_auto_auto_auto]">
                      <select value={s.dayOfWeek} onChange={(e) => changeSlot(i, 'dayOfWeek', e.target.value)} className={fieldCls}>
                        {DAYS.map((d) => <option key={d} value={d}>{DAY_AL[d]}</option>)}
                      </select>
                      <input type="time" value={s.start} onChange={(e) => changeSlot(i, 'start', e.target.value)} className={fieldCls} />
                      <input type="time" value={s.end} onChange={(e) => changeSlot(i, 'end', e.target.value)} className={fieldCls} />
                      <button
                        type="button"
                        onClick={() => removeSlotRow(i)}
                        disabled={formSlots.length <= 1}
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
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Anulo</Button>
                <Button type="submit" className={primaryBtn} disabled={saving}>{saving ? 'Duke ruajtur…' : 'Ruaj orarin'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Panel, Field, fieldCls, primaryBtn } from './DashboardKit'
import { Button } from './ui/button'
import { useSchedule, DAYS, TIME_SLOTS, fmtTime, type Session } from '../features/schedule/scheduleStore'
import { useNotification } from '../contexts/NotificationContext'

const ROOMS = ['Salla A', 'Salla B', 'Zona Open']

export default function WeeklyScheduleGrid() {
  const { sessions, moveSession, addSession, removeSession, hydrate } = useSchedule()
  const { addNotification } = useNotification()

  useEffect(() => {
    hydrate()
  }, [hydrate])
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', trainer: '', day: 0, startMin: TIME_SLOTS[0], durationMin: 60, room: ROOMS[0], capacity: 12 })

  const cellKey = (day: number, slot: number) => `${day}-${slot}`
  const at = (day: number, slot: number) => sessions.filter((s) => s.day === day && s.startMin === slot)

  const onDrop = async (day: number, slot: number) => {
    try {
      if (dragId) await moveSession(dragId, day, slot)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Orari nuk u ndryshua në server.', 'error')
    } finally {
      setDragId(null)
      setOver(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      await addSession({ ...form, title: form.title.trim(), trainer: form.trainer.trim() || '-' })
      setForm((f) => ({ ...f, title: '', trainer: '' }))
      setShowForm(false)
      addNotification('Sukses', 'Seanca u shtua në orar.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Seanca nuk u ruajt në server.', 'error')
    }
  }

  const remove = async (id: string) => {
    try {
      await removeSession(id)
      addNotification('Sukses', 'Seanca u fshi.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Seanca nuk u fshi nga serveri.', 'error')
    }
  }

  return (
    <Panel
      title="Orari javor — tërhiq për të rishtyer"
      action={
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Mbyll' : <><Plus className="mr-1 h-4 w-4" /> Seancë</>}
        </Button>
      }
    >
      {showForm && (
        <form onSubmit={submit} className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 p-3 sm:grid-cols-4">
          <Field label="Titulli"><input className={fieldCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Trajneri"><input className={fieldCls} value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></Field>
          <Field label="Dita">
            <select className={fieldCls} value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Ora">
            <select className={fieldCls} value={form.startMin} onChange={(e) => setForm({ ...form, startMin: Number(e.target.value) })}>
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
            </select>
          </Field>
          <Field label="Salla">
            <select className={fieldCls} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
              {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Kapaciteti"><input className={fieldCls} type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
          <Field label="Kohëzgjatja (min)"><input className={fieldCls} type="number" min={15} step={15} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></Field>
          <div className="flex items-end"><button type="submit" className={primaryBtn}>Shto</button></div>
        </form>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
            <div />
            {DAYS.map((d) => (
              <div key={d} className="px-1 pb-2 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="contents">
                <div className="border-t border-gray-100 py-2 pr-2 text-right text-[11px] font-medium text-gray-400">{fmtTime(slot)}</div>
                {DAYS.map((_, day) => {
                  const key = cellKey(day, slot)
                  const items = at(day, slot)
                  return (
                    <div
                      key={key}
                      onDragOver={(e) => { e.preventDefault(); setOver(key) }}
                      onDragLeave={() => setOver((o) => (o === key ? null : o))}
                      onDrop={() => onDrop(day, slot)}
                      className={`min-h-[56px] border-t border-l border-gray-100 p-1 transition ${over === key ? 'bg-coral-50 ring-1 ring-inset ring-coral-300' : ''}`}
                    >
                      {items.map((s: Session) => (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={() => setDragId(s.id)}
                          onDragEnd={() => { setDragId(null); setOver(null) }}
                          className={`group mb-1 cursor-grab rounded-lg border border-gray-200 bg-white px-2 py-1.5 active:cursor-grabbing ${dragId === s.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-gray-900">{s.title}</p>
                              <p className="truncate text-[10px] text-gray-400">{s.trainer} · {s.room}</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <GripVertical className="h-3 w-3 text-gray-300" />
                              <button
                                onClick={() => remove(s.id)}
                                className="mt-0.5 text-gray-300 opacity-0 transition hover:text-coral-600 group-hover:opacity-100"
                                aria-label="Fshij"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

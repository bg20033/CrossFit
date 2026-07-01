import { BarChart3, CalendarDays, LogOut, Megaphone, Timer, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, StatCard, Panel, EmptyState, Field, fieldCls, Badge, primaryBtn } from '../components/DashboardKit'
import WeeklyScheduleGrid from '../components/WeeklyScheduleGrid'

interface Day {
  date: string
  count: number
  minutes: number
}
interface Overview {
  year: number
  month: number
  totalVisitsMonth: number
  totalHoursMonth: number
  totalVisitsWeek: number
  uniqueMembersMonth: number
  busiestDay: string | null
  byWeekday: Record<string, number>
  days: Day[]
}
interface GymNotice {
  id: number
  type: string
  targetAudience: string
  title: string
  message: string
  startsAt: string
  endsAt?: string | null
  isActive: boolean
  createdBy: string
}

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const WD_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WD_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}
const NOTICE_TYPES: Record<string, string> = { announcement: 'Njoftim', closure: 'Mbyllje', reschedule: 'Shtyrje' }
const AUDIENCES: Record<string, string> = { all: 'Të gjithë', clients: 'Klientët', trainers: 'Trajnerët', staff: 'Stafi' }
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function AdminCalendar() {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState<Overview | null>(null)
  const [notices, setNotices] = useState<GymNotice[]>([])
  const [noticeForm, setNoticeForm] = useState({
    type: 'announcement',
    targetAudience: 'clients',
    title: '',
    message: '',
    startsAt: nowLocal(),
    endsAt: '',
  })

  const downloadIcs = async () => {
    const res = await api.get('/calendar/groups.ics', { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'standup-groups.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    api
      .get(`/attendance/overview?year=${cursor.year}&month=${cursor.month}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  }, [cursor])

  const fetchNotices = async () => {
    const res = await api.get('/gymnotices/admin?pageSize=20')
    setNotices(res.data ?? [])
  }

  useEffect(() => {
    fetchNotices().catch(() => setNotices([]))
  }, [])

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  const createNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/gymnotices', {
      ...noticeForm,
      startsAt: new Date(noticeForm.startsAt).toISOString(),
      endsAt: noticeForm.endsAt ? new Date(noticeForm.endsAt).toISOString() : null,
    })
    setNoticeForm((f) => ({ ...f, title: '', message: '', startsAt: nowLocal(), endsAt: '' }))
    fetchNotices()
  }

  const deactivateNotice = async (id: number) => {
    await api.delete(`/gymnotices/${id}`)
    fetchNotices()
  }

  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]))
  const dayBars = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const ds = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { day, count: byDate.get(ds)?.count ?? 0 }
  })
  const maxDay = Math.max(1, ...dayBars.map((d) => d.count))
  const wd = data?.byWeekday ?? {}
  const maxWd = Math.max(1, ...WD_ORDER.map((k) => wd[k] ?? 0))
  const hasData = (data?.totalVisitsMonth ?? 0) > 0

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Admin"
        title="Kalendari & Prezenca"
        subtitle="Sa është zënë palestra gjatë javës dhe muajit."
        right={
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <button onClick={() => move(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">‹</button>
              <button onClick={() => move(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">›</button>
            </div>
            <span className="text-sm font-semibold text-gray-700">{MONTHS[cursor.month - 1]} {cursor.year}</span>
            <button
              onClick={downloadIcs}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ICS
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<LogOut className="h-5 w-5" />} label="Vizita (muaj)" value={data?.totalVisitsMonth ?? 0} />
        <StatCard icon={<Timer className="h-5 w-5" />} label="Orë të zëna (muaj)" value={`${data?.totalHoursMonth ?? 0} h`} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Kjo javë" value={data?.totalVisitsWeek ?? 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Dita më e ngarkuar" value={data?.busiestDay ? (WD_AL[data.busiestDay] ?? data.busiestDay) : '—'} />
      </div>

      <WeeklyScheduleGrid />

      <Panel title="Zënia sipas ditës së javës">
        {!hasData ? (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="Ende s'ka check-in. Bëj check-in te Klientët për të mbushur grafikun." />
        ) : (
          <div className="space-y-2">
            {WD_ORDER.map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{WD_AL[k]}</span>
                  <span className="font-medium text-gray-700">{wd[k] ?? 0} vizita</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-coral-500" style={{ width: `${((wd[k] ?? 0) / maxWd) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`Vizita ditë për ditë — ${MONTHS[cursor.month - 1]}`}>
        {!hasData ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Pa të dhëna për këtë muaj." />
        ) : (
          <div className="flex items-end gap-1 pt-2" style={{ height: 160 }}>
            {dayBars.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.count} vizita`}>
                <div className="w-full rounded-t bg-gray-800" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }} />
                {d.day % 5 === 0 && <span className="text-[9px] text-gray-400">{d.day}</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Njoftim për klientë / orar">
          <form onSubmit={createNotice} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Lloji">
                <select
                  value={noticeForm.type}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, type: e.target.value }))}
                  className={fieldCls}
                >
                  {Object.entries(NOTICE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Audienca">
                <select
                  value={noticeForm.targetAudience}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, targetAudience: e.target.value }))}
                  className={fieldCls}
                >
                  {Object.entries(AUDIENCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Titulli">
              <input
                value={noticeForm.title}
                onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                required
                maxLength={160}
                placeholder="p.sh. Palestra mbyllet të dielën"
                className={fieldCls}
              />
            </Field>
            <Field label="Mesazhi">
              <textarea
                value={noticeForm.message}
                onChange={(e) => setNoticeForm((f) => ({ ...f, message: e.target.value }))}
                required
                maxLength={2000}
                rows={3}
                className={fieldCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fillon">
                <input
                  type="datetime-local"
                  value={noticeForm.startsAt}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className={fieldCls}
                />
              </Field>
              <Field label="Mbaron (opsionale)">
                <input
                  type="datetime-local"
                  value={noticeForm.endsAt}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, endsAt: e.target.value }))}
                  className={fieldCls}
                />
              </Field>
            </div>
            <button type="submit" className={primaryBtn}>Publiko njoftimin</button>
          </form>
        </Panel>

        <Panel title="Njoftimet aktive" action={<Badge>{notices.length}</Badge>}>
          {notices.length === 0 ? (
            <EmptyState icon={<Megaphone className="h-5 w-5" />} text="S'ka njoftime aktive." />
          ) : (
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      <p className="mt-1 text-xs text-gray-400">{NOTICE_TYPES[n.type] ?? n.type} · {AUDIENCES[n.targetAudience] ?? n.targetAudience}</p>
                    </div>
                    <button onClick={() => deactivateNotice(n.id)} className="text-xs font-semibold text-gray-500 hover:text-gray-900">Mbyll</button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  )
}

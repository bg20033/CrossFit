import { CalendarDays, Flame, Megaphone, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, StatCard, Panel, DayStrip, StreakBadge, WeeklyBars, EmptyState, Badge } from '../components/DashboardKit'

interface Day {
  date: string
  count: number
  minutes: number
}
interface Summary {
  year: number
  month: number
  totalAllTime: number
  totalThisMonth: number
  totalThisWeek: number
  attendedDaysThisMonth: number
  attendanceRate: number
  currentStreak: number
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
}

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const WD = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
const todayStr = new Date().toISOString().slice(0, 10)
const NOTICE_TYPES: Record<string, string> = { announcement: 'Njoftim', closure: 'Mbyllje', reschedule: 'Shtyrje' }

export default function ClientCalendar() {
  const { profileId } = useAuth()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState<Summary | null>(null)
  const [selected, setSelected] = useState<Day | null>(null)
  const [notices, setNotices] = useState<GymNotice[]>([])

  const downloadIcs = async () => {
    const res = await api.get('/calendar/me.ics', { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'standup-calendar.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (profileId == null) return
    api
      .get(`/attendance/client-summary?clientId=${profileId}&year=${cursor.year}&month=${cursor.month}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  }, [profileId, cursor])

  useEffect(() => {
    api
      .get('/gymnotices?pageSize=8')
      .then((r) => setNotices(r.data ?? []))
      .catch(() => setNotices([]))
  }, [])

  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]))
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const firstWd = (new Date(cursor.year, cursor.month - 1, 1).getDay() + 6) % 7
  const cells: (number | null)[] = [...Array(firstWd).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const move = (delta: number) => {
    setSelected(null)
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  const dateStr = (day: number) => `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const markedDays = new Set((data?.days ?? []).map((d) => d.date))

  // Visit counts for Mon–Sun of the week containing today.
  const weekBars = (() => {
    const t = new Date(todayStr)
    const monday = new Date(t)
    monday.setDate(t.getDate() - ((t.getDay() + 6) % 7))
    const labels = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
    return labels.map((label, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { label, value: byDate.get(iso)?.count ?? 0 }
    })
  })()

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title="Kalendari im"
        subtitle="Sa herë ke ardhur dhe sa rregullt je."
        right={profileId != null ? (
          <div className="flex items-center gap-2">
            {(data?.currentStreak ?? 0) > 0 && <StreakBadge days={data!.currentStreak} label="ditë" />}
            <button
              onClick={downloadIcs}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ICS
            </button>
          </div>
        ) : undefined}
      />

      <Panel title="Njoftime për orarin" action={<Badge>{notices.length}</Badge>}>
        {notices.length === 0 ? (
          <EmptyState icon={<Megaphone className="h-5 w-5" />} text="S'ka njoftime aktive për momentin." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {notices.map((n) => (
              <div key={n.id} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <p className="mt-1 text-xs text-gray-400">{NOTICE_TYPES[n.type] ?? n.type}</p>
                  </div>
                  {n.type === 'closure' && <Badge>Urgjente</Badge>}
                </div>
                <p className="text-sm text-gray-600">{n.message}</p>
                <p className="mt-3 text-xs text-gray-400">
                  Nga {new Date(n.startsAt).toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {n.endsAt ? ` deri ${new Date(n.endsAt).toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Kjo javë">
        <DayStrip year={cursor.year} month={cursor.month} marked={markedDays} today={todayStr} />
        {weekBars.some((b) => b.value > 0) && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <WeeklyBars data={weekBars} height={130} />
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Këtë muaj" value={data?.totalThisMonth ?? 0} sub={`${data?.attendedDaysThisMonth ?? 0} ditë`} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Këtë javë" value={data?.totalThisWeek ?? 0} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Streak" value={`${data?.currentStreak ?? 0} ditë`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Rregullsia" value={`${data?.attendanceRate ?? 0}%`} sub="këtë muaj" />
      </div>

      <Panel
        title={`${MONTHS[cursor.month - 1]} ${cursor.year}`}
        action={
          <div className="flex gap-1">
            <button onClick={() => move(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">‹</button>
            <button onClick={() => move(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">›</button>
          </div>
        }
      >
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          {WD.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, i) => {
            if (day == null) return <div key={`b${i}`} />
            const ds = dateStr(day)
            const att = byDate.get(ds)
            const isToday = ds === todayStr
            return (
              <button
                key={ds}
                onClick={() => att && setSelected(att)}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition ${
                  att
                    ? 'border-coral-500 bg-coral-500 text-white'
                    : isToday
                    ? 'border-coral-400 text-coral-600'
                    : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className={att ? 'font-semibold' : ''}>{day}</span>
                {att && <span className="text-[10px]">{att.count > 1 ? `×${att.count}` : ''}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-coral-500" /> Ardhur</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-coral-400" /> Sot</span>
        </div>

        {selected && (
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">{selected.date}</p>
            <p className="text-gray-600">{selected.count} vizitë{selected.count > 1 ? 'a' : ''}{selected.minutes > 0 ? ` · ${Math.round(selected.minutes)} min` : ''}</p>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

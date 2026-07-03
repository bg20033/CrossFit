import { CalendarDays, Flame, Megaphone, TrendingUp, Users } from 'lucide-react'
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
interface MyGroupSlot { dayOfWeek: string; startMin: number; endMin: number }
interface MyGroupException {
  date: string
  startMin: number
  endMin: number
  status: string // cancelled | postponed | (scheduled/held not sent — only exceptions come through)
  reason?: string | null
  postponedToDate?: string | null
  substituteTrainer?: string | null
}
interface MyGroup {
  id: number
  name: string
  trainer: string
  slots?: MyGroupSlot[]
  isWaitlisted?: boolean
  exceptions?: MyGroupException[]
}

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const WD = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
const todayStr = new Date().toISOString().slice(0, 10)
const NOTICE_TYPES: Record<string, string> = { announcement: 'Njoftim', closure: 'Mbyllje', reschedule: 'Shtyrje' }
// Indeksi i ditës (Hën=0…Die=6) nga emrat anglisht të slots-ave.
const DAY_IDX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const STATUS_AL: Record<string, string> = { cancelled: 'Anuluar', postponed: 'Shtyrë' }

export default function ClientCalendar() {
  const { profileId } = useAuth()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState<Summary | null>(null)
  const [selected, setSelected] = useState<Day | null>(null)
  const [notices, setNotices] = useState<GymNotice[]>([])
  const [myGroups, setMyGroups] = useState<MyGroup[]>([])

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

  // Grupet e klientit — kalendari lidhet me orarin real të grupeve të tij.
  useEffect(() => {
    if (profileId == null) return
    api
      .get(`/memberships/current?clientId=${profileId}`)
      .then((r) => setMyGroups(Array.isArray(r.data?.groups) ? r.data.groups : []))
      .catch(() => setMyGroups([]))
  }, [profileId])

  // Orari javor i grupeve: [dita 0-6] → seancat e asaj dite (pa waitlist).
  const weekSchedule = (() => {
    const byDay: { day: number; group: string; trainer: string; startMin: number; endMin: number }[] = []
    for (const g of myGroups) {
      if (g.isWaitlisted) continue
      for (const s of g.slots ?? []) {
        const idx = DAY_IDX[s.dayOfWeek]
        if (idx != null) byDay.push({ day: idx, group: g.name, trainer: g.trainer, startMin: s.startMin, endMin: s.endMin })
      }
    }
    return byDay.sort((a, b) => a.day - b.day || a.startMin - b.startMin)
  })()
  const groupWeekdays = new Set(weekSchedule.map((s) => s.day))

  // Ekuacionet e sotme/të ardhshme (anuluar/shtyrë) — trajneri/admini i ndryshoi
  // për një datë konkrete, kalendari s'duhet me e përsëritur thjesht orarin javor.
  const upcomingExceptions = (() => {
    const out: { groupName: string; date: string; startMin: number; endMin: number; status: string; reason?: string | null; postponedToDate?: string | null; substituteTrainer?: string | null }[] = []
    for (const g of myGroups) {
      if (g.isWaitlisted) continue
      for (const ex of g.exceptions ?? []) {
        out.push({ groupName: g.name, ...ex })
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  })()
  const exceptionsByDate = new Map<string, typeof upcomingExceptions>()
  for (const ex of upcomingExceptions) {
    const ds = ex.date.slice(0, 10)
    const list = exceptionsByDate.get(ds) ?? []
    list.push(ex)
    exceptionsByDate.set(ds, list)
  }

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

      <Panel title="Orari i grupeve të mia" action={<Badge accent="teal">{myGroups.filter((g) => !g.isWaitlisted).length}</Badge>}>
        {weekSchedule.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text="S'je i lidhur ende me ndonjë grup — kontakto recepsionin ose trajnerin." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekSchedule.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5">
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <span className="text-[11px] font-bold uppercase">{WD[s.day]}</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{s.group}</p>
                  <p className="text-xs text-gray-500">{hhmm(s.startMin)}–{hhmm(s.endMin)} · me {s.trainer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {myGroups.some((g) => g.isWaitlisted) && (
          <p className="mt-3 text-xs text-gray-400">
            Në pritje: {myGroups.filter((g) => g.isWaitlisted).map((g) => g.name).join(', ')} — të njoftojmë kur lirohet vend.
          </p>
        )}
        {upcomingExceptions.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ndryshime në 14 ditët e ardhshme</p>
            {upcomingExceptions.map((ex, i) => (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  ex.status === 'cancelled' ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <span className="font-semibold">{ex.groupName}</span> ·{' '}
                {new Date(`${ex.date.slice(0, 10)}T12:00:00`).toLocaleDateString('sq-AL', { weekday: 'short', day: '2-digit', month: 'short' })}{' '}
                {hhmm(ex.startMin)}–{hhmm(ex.endMin)} — {STATUS_AL[ex.status] ?? ex.status}
                {ex.postponedToDate ? ` → ${new Date(ex.postponedToDate).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })}` : ''}
                {ex.substituteTrainer ? ` · zëvendësim: ${ex.substituteTrainer}` : ''}
                {ex.reason ? ` · ${ex.reason}` : ''}
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
            // Ditë grupi: kjo datë bie në ditën javore të një grupi të klientit
            // (shënohet vetëm sot e në të ardhmen — e kaluara flet me prezencë).
            const wd = (new Date(`${ds}T12:00:00`).getDay() + 6) % 7
            const isGroupDay = ds >= todayStr && groupWeekdays.has(wd)
            const dayExceptions = exceptionsByDate.get(ds) ?? []
            const isCancelled = dayExceptions.some((e) => e.status === 'cancelled')
            const isPostponed = !isCancelled && dayExceptions.some((e) => e.status === 'postponed')
            const isException = isCancelled || isPostponed
            return (
              <button
                key={ds}
                onClick={() => att && setSelected(att)}
                title={isException ? dayExceptions.map((e) => `${e.groupName}: ${STATUS_AL[e.status] ?? e.status}${e.postponedToDate ? ` → ${e.postponedToDate.slice(0, 10)}` : ''}`).join(' · ') : undefined}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition ${
                  att
                    ? 'border-coral-500 bg-coral-500 text-white'
                    : isToday
                    ? 'border-coral-400 text-coral-600'
                    : isCancelled
                    ? 'border-gray-300 bg-gray-100 text-gray-400 line-through decoration-gray-400'
                    : isPostponed
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : isGroupDay
                    ? 'border-teal-200 bg-teal-50/60 text-gray-600 hover:bg-teal-50'
                    : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className={att ? 'font-semibold' : ''}>{day}</span>
                {att && <span className="text-[10px]">{att.count > 1 ? `×${att.count}` : ''}</span>}
                {!att && isGroupDay && !isException && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" />}
                {!att && isCancelled && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-gray-400" />}
                {!att && isPostponed && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-coral-500" /> Ardhur</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-coral-400" /> Sot</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-teal-200 bg-teal-50" /> Ditë grupi</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-300 bg-amber-50" /> Shtyrë</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-gray-300 bg-gray-100" /> Anuluar</span>
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

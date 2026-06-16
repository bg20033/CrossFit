import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, StatCard, Panel } from '../components/DashboardKit'

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

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const WD = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
const todayStr = new Date().toISOString().slice(0, 10)

export default function ClientCalendar() {
  const { profileId } = useAuth()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState<Summary | null>(null)
  const [selected, setSelected] = useState<Day | null>(null)

  useEffect(() => {
    if (profileId == null) return
    api
      .get(`/attendance/client-summary?clientId=${profileId}&year=${cursor.year}&month=${cursor.month}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  }, [profileId, cursor])

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

  return (
    <DashboardShell>
      <DashboardHeader badge="Klient" title="Kalendari im" subtitle="Sa herë ke ardhur dhe sa rregullt je." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="📅" label="Këtë muaj" value={data?.totalThisMonth ?? 0} sub={`${data?.attendedDaysThisMonth ?? 0} ditë`} />
        <StatCard icon="🗓️" label="Këtë javë" value={data?.totalThisWeek ?? 0} />
        <StatCard icon="🔥" label="Streak" value={`${data?.currentStreak ?? 0} ditë`} />
        <StatCard icon="📈" label="Rregullsia" value={`${data?.attendanceRate ?? 0}%`} sub="këtë muaj" />
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
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : isToday
                    ? 'border-gray-400 text-gray-900'
                    : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className={att ? 'font-semibold' : ''}>{day}</span>
                {att && <span className="text-[10px]">✓{att.count > 1 ? `×${att.count}` : ''}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-900" /> Ardhur</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-gray-400" /> Sot</span>
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

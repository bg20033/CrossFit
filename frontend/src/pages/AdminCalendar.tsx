import { useState, useEffect } from 'react'
import api from '../utils/api'
import { DashboardShell, DashboardHeader, StatCard, Panel, EmptyState } from '../components/DashboardKit'

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

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const WD_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WD_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}

export default function AdminCalendar() {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    api
      .get(`/attendance/overview?year=${cursor.year}&month=${cursor.month}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  }, [cursor])

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

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
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🚪" label="Vizita (muaj)" value={data?.totalVisitsMonth ?? 0} />
        <StatCard icon="⏱️" label="Orë të zëna (muaj)" value={`${data?.totalHoursMonth ?? 0} h`} />
        <StatCard icon="🗓️" label="Kjo javë" value={data?.totalVisitsWeek ?? 0} />
        <StatCard icon="🔝" label="Dita më e ngarkuar" value={data?.busiestDay ? (WD_AL[data.busiestDay] ?? data.busiestDay) : '—'} />
      </div>

      <Panel title="Zënia sipas ditës së javës">
        {!hasData ? (
          <EmptyState icon="📊" text="Ende s'ka check-in. Bëj check-in te Klientët për të mbushur grafikun." />
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
          <EmptyState icon="📅" text="Pa të dhëna për këtë muaj." />
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
    </DashboardShell>
  )
}

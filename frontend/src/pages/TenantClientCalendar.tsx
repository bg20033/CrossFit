import { CalendarDays, Clock, Mail, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader, DashboardShell, EmptyState, Panel, StatCard, Badge } from '../components/DashboardKit'
import { fmtMin } from '../features/access/accessEngine'
import api from '../utils/api'

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nentor', 'Dhjetor']
const WD = ['Hen', 'Mar', 'Mer', 'Enj', 'Pre', 'Sht', 'Die']
const STATUS: Record<string, string> = {
  scheduled: 'Planifikuar',
  held: 'Mbajtur',
  cancelled: 'Anuluar',
  postponed: 'Shtyre',
}

interface Session {
  id: number | null
  date: string
  dayOfWeek: string
  startMin: number
  endMin: number
  status: string
  reason?: string | null
  postponedToDate?: string | null
  virtual: boolean
}

interface Payload {
  name: string
  businessName: string
  trainer: string
  sessions: Session[]
}

const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateKey = (raw: string) => raw.slice(0, 10)

export default function TenantClientCalendar() {
  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const load = async (year = period.year, month = period.month) => {
    setLoading(true)
    try {
      const res = await api.get('/rentalsessions/tenant-client', { params: { year, month } })
      setPayload({
        name: res.data?.name ?? '',
        businessName: res.data?.businessName ?? '',
        trainer: res.data?.trainer ?? '',
        sessions: Array.isArray(res.data?.sessions) ? res.data.sessions : [],
      })
    } catch {
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const move = (delta: number) => {
    setSelectedDate(null)
    setPeriod((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1)
      const next = { year: d.getFullYear(), month: d.getMonth() + 1 }
      load(next.year, next.month)
      return next
    })
  }

  const sessions = payload?.sessions ?? []
  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const session of sessions) {
      const key = dateKey(session.date)
      map.set(key, [...(map.get(key) ?? []), session])
    }
    return map
  }, [sessions])

  const daysInMonth = new Date(period.year, period.month, 0).getDate()
  const firstWd = (new Date(period.year, period.month - 1, 1).getDay() + 6) % 7
  const cells: (number | null)[] = [...Array(firstWd).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const today = isoDay(new Date())
  const selectedSessions = selectedDate ? byDate.get(selectedDate) ?? [] : []
  const upcoming = sessions
    .filter((s) => dateKey(s.date) >= today && s.status !== 'cancelled')
    .sort((a, b) => `${dateKey(a.date)}-${a.startMin}`.localeCompare(`${dateKey(b.date)}-${b.startMin}`))
    .slice(0, 5)
  const cancelled = sessions.filter((s) => s.status === 'cancelled').length

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient qiragjie"
        title="Orari im"
        subtitle={payload ? `${payload.businessName || 'Hapesira'} - ${payload.trainer || 'Trajneri'}` : 'Orari yt me trajnerin qiragji.'}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Seanca kete muaj" value={sessions.length} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Te ardhshme" value={upcoming.length} />
        <StatCard icon={<UserRound className="h-5 w-5" />} label="Trajneri" value={payload?.trainer || '-'} />
        <StatCard icon={<Mail className="h-5 w-5" />} label="Ndryshime" value={cancelled} sub="anulime/shtyrje" />
      </div>

      <Panel
        title={`${MONTHS[period.month - 1]} ${period.year}`}
        action={
          <div className="flex gap-1">
            <button onClick={() => move(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              ‹
            </button>
            <button onClick={() => move(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              ›
            </button>
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar...</p>
        ) : !payload ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Profili yt i qiragjise nuk u gjet ose nuk ka orar." />
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
              {WD.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((day, i) => {
                if (day == null) return <div key={`b${i}`} />
                const ds = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const rows = byDate.get(ds) ?? []
                const hasCancelled = rows.some((s) => s.status === 'cancelled')
                const isToday = ds === today
                return (
                  <button
                    key={ds}
                    onClick={() => rows.length > 0 && setSelectedDate(ds)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition ${
                      rows.length
                        ? hasCancelled
                          ? 'border-gray-300 bg-gray-100 text-gray-500'
                          : 'border-coral-500 bg-coral-500 text-white'
                        : isToday
                        ? 'border-coral-400 text-coral-600'
                        : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={rows.length ? 'font-semibold' : ''}>{day}</span>
                    {rows.length > 0 && <span className="text-[10px]">{rows.length > 1 ? `x${rows.length}` : fmtMin(rows[0].startMin)}</span>}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-coral-500" /> Seance</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-200" /> Anuluar/shtyre</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-coral-400" /> Sot</span>
            </div>
          </>
        )}
      </Panel>

      {selectedDate && (
        <Panel title={selectedDate}>
          <div className="space-y-2">
            {selectedSessions.map((s, i) => (
              <div key={`${s.id ?? 'v'}-${i}`} className="rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{fmtMin(s.startMin)}-{fmtMin(s.endMin)}</p>
                  <Badge>{STATUS[s.status] ?? s.status}</Badge>
                </div>
                {s.postponedToDate && <p className="mt-1 text-xs text-gray-500">Shtyre per {dateKey(s.postponedToDate)}</p>}
                {s.reason && <p className="mt-1 text-xs text-gray-500">{s.reason}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Seancat e ardhshme">
        {upcoming.length === 0 ? (
          <EmptyState icon={<Clock className="h-5 w-5" />} text="Nuk ka seanca te ardhshme per kete muaj." />
        ) : (
          <div className="space-y-2">
            {upcoming.map((s, i) => (
              <div key={`${s.id ?? 'v'}-${i}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div>
                  <p className="font-semibold text-gray-900">{dateKey(s.date)}</p>
                  <p className="text-xs text-gray-500">{fmtMin(s.startMin)}-{fmtMin(s.endMin)}</p>
                </div>
                <Badge>{STATUS[s.status] ?? s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

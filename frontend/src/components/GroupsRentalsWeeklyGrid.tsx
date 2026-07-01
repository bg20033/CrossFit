import { useEffect, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { Panel, EmptyState } from './DashboardKit'
import api from '../utils/api'

/**
 * Read-only weekly overview that ties the calendar to the real scheduling
 * sources — Training Groups (with their assigned trainer) and rental tenants
 * / qiragjinj (their own rented weekly slots) — instead of a disconnected
 * ad-hoc schedule. Both come straight from the same endpoints AdminGroups
 * and AdminRentals use, so this always matches what's actually configured.
 */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Hën', Tuesday: 'Mar', Wednesday: 'Mër', Thursday: 'Enj',
  Friday: 'Pre', Saturday: 'Sht', Sunday: 'Die',
}

const DAY_START = 6 * 60 // 06:00
const DAY_END = 22 * 60 // 22:00
const SPAN = DAY_END - DAY_START
const GRID_HEIGHT = 560

interface Slot {
  dayOfWeek: string
  startMin: number
  endMin: number
}
interface GroupRow {
  id: number
  name: string
  trainer: string
  slots: Slot[]
}
interface TenantRow {
  id: number
  businessName: string
  trainer: string
  slots: Slot[]
}
interface Block {
  key: string
  day: string
  startMin: number
  endMin: number
  label: string
  sub: string
  kind: 'group' | 'rental'
}

const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function GroupsRentalsWeeklyGrid() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/traininggroups').then((r) => setGroups(r.data ?? [])).catch(() => setGroups([])),
      api.get('/rentals/tenants').then((r) => setTenants(r.data ?? [])).catch(() => setTenants([])),
    ]).finally(() => setLoading(false))
  }, [])

  const blocks: Block[] = [
    ...groups.flatMap((g) =>
      (g.slots ?? []).map((s) => ({
        key: `g-${g.id}-${s.dayOfWeek}-${s.startMin}`,
        day: s.dayOfWeek,
        startMin: s.startMin,
        endMin: s.endMin,
        label: g.name,
        sub: `Grup · ${g.trainer}`,
        kind: 'group' as const,
      }))
    ),
    ...tenants.flatMap((t) =>
      (t.slots ?? []).map((s) => ({
        key: `t-${t.id}-${s.dayOfWeek}-${s.startMin}`,
        day: s.dayOfWeek,
        startMin: s.startMin,
        endMin: s.endMin,
        label: t.businessName,
        sub: `Qira · ${t.trainer}`,
        kind: 'rental' as const,
      }))
    ),
  ]

  const hourMarks = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)

  return (
    <Panel
      title="Orari javor — Grupe & Qira"
      action={
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-coral-500" /> Grup</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-900" /> Qira</span>
        </div>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-5 w-5" />}
          text="S'ka grupe ose qiragjinj me orar javor të konfiguruar ende."
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div />
              {DAYS.map((d) => (
                <div key={d} className="px-1 pb-2 text-center text-xs font-semibold text-gray-500">{DAY_SHORT[d]}</div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {hourMarks.map((m) => (
                  <div
                    key={m}
                    className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-gray-400"
                    style={{ top: `${((m - DAY_START) / SPAN) * 100}%` }}
                  >
                    {minToHHMM(m)}
                  </div>
                ))}
              </div>
              {DAYS.map((day) => (
                <div key={day} className="relative border-l border-gray-100" style={{ height: GRID_HEIGHT }}>
                  {hourMarks.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 border-t border-gray-50"
                      style={{ top: `${((m - DAY_START) / SPAN) * 100}%` }}
                    />
                  ))}
                  {blocks
                    .filter((b) => b.day === day)
                    .map((b) => {
                      const top = Math.max(0, ((b.startMin - DAY_START) / SPAN) * 100)
                      const height = Math.max(3, ((b.endMin - b.startMin) / SPAN) * 100)
                      const isRental = b.kind === 'rental'
                      return (
                        <div
                          key={b.key}
                          title={`${b.label} · ${b.sub} · ${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`}
                          className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-[10px] leading-tight ${
                            isRental
                              ? 'border-gray-800 bg-gray-900 text-white'
                              : 'border-coral-400 bg-coral-50 text-coral-800'
                          }`}
                          style={{ top: `${top}%`, height: `${height}%` }}
                        >
                          <p className="truncate font-semibold">{b.label}</p>
                          <p className="truncate opacity-80">{b.sub}</p>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

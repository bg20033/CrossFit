import { ArrowLeft, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock, TrendingUp, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Badge,
  BarList,
  DashboardHeader,
  DashboardShell,
  EmptyState,
  ListSkeleton,
  Panel,
  Skeleton,
  StatCard,
  WeeklyBars,
} from '../components/DashboardKit'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { eur } from '../utils/format'

interface GroupInfo {
  id: number
  name: string
  description?: string
  trainerId: number
  trainer: string
  maxCapacity: number
  members: { id: number; name: string; email: string }[]
  slots: { dayOfWeek: string; startMin: number; endMin: number }[]
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

interface AttendanceClient {
  clientName: string
  totalSessions: number
  present: number
  absent: number
  attendanceRate: number
}

interface GroupAttendance {
  month: string
  attendance: AttendanceClient[]
}

interface Commission {
  id: number
  trainerId: number
  trainer: string
  year: number
  month: number
  clientCount: number
  ratePerClient: number
  sessionsPlanned: number
  sessionsHeld: number
  sessionsCancelled: number
  paymentModel: string
  proratedAmount: number
  bonus: number
  deductions: number
  totalAmount: number
  status: string
  paidDate?: string
}

interface SessionAttendance {
  sessionId: number
  date: string
  presentCount: number
  totalCount: number
  attendanceRate: number
}

const DAY_AL: Record<string, string> = {
  Monday: 'E Hënë',
  Tuesday: 'E Martë',
  Wednesday: 'E Mërkurë',
  Thursday: 'E Enjte',
  Friday: 'E Premte',
  Saturday: 'E Shtunë',
  Sunday: 'E Diel',
}
const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']
const STATUS_AL: Record<string, string> = {
  scheduled: 'Planifikuar',
  held: 'Mbajtur',
  cancelled: 'Anuluar',
  postponed: 'Shtyrë',
}
const STATUS_BADGE: Record<string, 'green' | 'gray' | 'red' | 'orange'> = {
  scheduled: 'gray',
  held: 'green',
  cancelled: 'red',
  postponed: 'orange',
}

const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function AdminGroupReport() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { addNotification } = useNotification()

  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [groupAttendance, setGroupAttendance] = useState<GroupAttendance | null>(null)
  const [sessionAttendance, setSessionAttendance] = useState<SessionAttendance[]>([])
  const [commission, setCommission] = useState<Commission | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReport = async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const groupRes = await api.get(`/traininggroups/${groupId}`)
      const g = groupRes.data as GroupInfo
      setGroup(g)

      const [sessionsRes, attendanceRes, paymentsRes, perSessionRes] = await Promise.all([
        api.get(`/groupsessions?groupId=${groupId}&year=${period.year}&month=${period.month}`),
        api.get(`/traininggroups/${groupId}/attendance?year=${period.year}&month=${period.month}`),
        api.get(`/trainerpayments?year=${period.year}&month=${period.month}`),
        // Provo endpointin e planifikuar per session attendance; nese deshton, injoro
        api.get(`/attendance/group/${groupId}?year=${period.year}&month=${period.month}`).catch(() => null),
      ])

      setSessions(sessionsRes.data ?? [])
      setGroupAttendance(attendanceRes.data ?? null)

      const commissions = paymentsRes.data ?? []
      const trainerComm = commissions.find((c: Commission) => c.trainerId === g.trainerId)
      setCommission(trainerComm || null)

      if (perSessionRes?.data?.sessions) {
        setSessionAttendance(perSessionRes.data.sessions)
      } else {
        setSessionAttendance([])
      }
    } catch {
      addNotification('Gabim', 'Ngarkimi i raportit dështoi.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [groupId, period.year, period.month])

  const changePeriod = (delta: number) => {
    setPeriod((prev) => {
      let m = prev.month + delta
      let y = prev.year
      if (m > 12) { m = 1; y++ }
      if (m < 1) { m = 12; y-- }
      return { year: y, month: m }
    })
  }

  const heldCount = sessions.filter((s) => s.status === 'held').length

  const membersCount = group?.members?.length ?? 0

  const attendanceList = groupAttendance?.attendance ?? []
  const totalPossible = attendanceList.reduce((sum, a) => sum + a.totalSessions, 0)
  const totalPresent = attendanceList.reduce((sum, a) => sum + a.present, 0)
  const avgAttendanceRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0

  const commissionAmount = commission?.totalAmount ?? 0

  const getSessionAttendance = (session: Session): { present: number; rate: number } => {
    const found = sessionAttendance.find((sa) => sa.sessionId === session.id)
    if (found) return { present: found.presentCount, rate: Math.round(found.attendanceRate) }
    // Nese nuk ka te dhena per session, perdor rate mesatar
    if (session.status === 'held') {
      return { present: membersCount > 0 ? Math.round((membersCount * avgAttendanceRate) / 100) : 0, rate: avgAttendanceRate }
    }
    return { present: 0, rate: 0 }
  }

  const chartData = useMemo(() => {
    return sessions.map((s) => {
      const d = new Date(s.date)
      const label = `${d.getDate()} ${MONTHS[period.month - 1]}`
      const { rate } = getSessionAttendance(s)
      return { label, value: rate }
    })
  }, [sessions, sessionAttendance, avgAttendanceRate, membersCount, period.month])

  const clientBarData = useMemo(() => {
    return attendanceList
      .map((a) => ({
        label: a.clientName,
        value: a.attendanceRate,
        hint: `${a.present}/${a.totalSessions}`,
      }))
      .sort((a, b) => b.value - a.value)
  }, [attendanceList])

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Raport Grupi"
        title={group?.name || 'Raporti i Grupit'}
        subtitle={
          group
            ? `Trajner: ${group.trainer} · Kapaciteti: ${membersCount}/${group.maxCapacity} · Periudha: ${MONTHS[period.month - 1]} ${period.year}`
            : 'Duke ngarkuar...'
        }
        right={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1">
              <button
                onClick={() => changePeriod(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Muaji i kaluar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[120px] text-center text-sm font-medium text-gray-800">
                {MONTHS[period.month - 1]} {period.year}
              </span>
              <button
                onClick={() => changePeriod(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Muaji i ardhshëm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/groups')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Kthehu
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Anëtarët"
            value={membersCount}
            sub={`Kapacitet: ${group?.maxCapacity ?? 0}`}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Seanca të mbajtura"
            value={heldCount}
            sub={`Total: ${sessions.length}`}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Attendance mesatar"
            value={`${avgAttendanceRate}%`}
            sub={`${totalPresent} prezenca`}
          />
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Fitimi trajneri"
            value={commission ? eur(commissionAmount) : '—'}
            sub={commission ? `${commission.paymentModel} · ${commission.status}` : 'Nuk ka komision'}
          />
        </div>
      )}

      {/* Seancat e muajit */}
      <Panel title="Seancat e muajit">
        {loading ? (
          <ListSkeleton rows={6} />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            text="Nuk ka seanca për këtë muaj. Gjenero seancat nga faqja e grupeve."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-3 pt-1 pr-4">Datë</th>
                  <th className="pb-3 pt-1 pr-4">Ditë</th>
                  <th className="pb-3 pt-1 pr-4">Orë</th>
                  <th className="pb-3 pt-1 pr-4">Status</th>
                  <th className="pb-3 pt-1 pr-4">Trajner zëvendësues</th>
                  <th className="pb-3 pt-1 pr-4">Prezenca</th>
                  <th className="pb-3 pt-1 pr-4">Attendance %</th>
                  <th className="pb-3 pt-1">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => {
                  const { present, rate } = getSessionAttendance(s)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="py-3 pr-4 whitespace-nowrap">{s.date.slice(0, 10)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">{DAY_AL[s.dayOfWeek] ?? s.dayOfWeek}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">{minToHHMM(s.startMin)}</td>
                      <td className="py-3 pr-4">
                        <Badge accent={STATUS_BADGE[s.status] ?? 'gray'}>{STATUS_AL[s.status] ?? s.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {s.substituteTrainer ? (
                          <span className="text-xs font-medium text-coral-600">{s.substituteTrainer}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {s.status === 'held' ? (
                          <span className="text-xs text-gray-700">
                            {present}/{membersCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {s.status === 'held' ? (
                          <span className="text-xs font-medium text-gray-700">{rate}%</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {s.status === 'held' && s.trainerCheckedIn && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Clock className="h-3 w-3" /> Check-in
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Grafik + Prezenca sipas anëtarëve */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Grafik i prezencës">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="Nuk ka te dhena per grafik." />
          ) : (
            <div className="pt-2">
              <WeeklyBars data={chartData} height={180} unit="%" />
              <p className="mt-2 text-xs text-gray-400">
                {sessionAttendance.length > 0
                  ? 'Attendance rate për çdo seancë (të dhëna të sakta).'
                  : 'Attendance rate i vlerësuar nga mesatarja e grupit.'}
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Prezenca sipas anëtarëve">
          {loading ? (
            <ListSkeleton rows={5} />
          ) : clientBarData.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} text="Nuk ka te dhena prezence për këtë muaj." />
          ) : (
            <div className="pt-2">
              <BarList items={clientBarData} />
              <p className="mt-3 text-xs text-gray-400">
                Total: {totalPresent} prezenca nga {totalPossible} mundësi ({avgAttendanceRate}%)
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* Përmbledhje e komisionit */}
      {commission && (
        <Panel title="Detaje komisioni">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="text-xs text-gray-500">Modeli</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {commission.paymentModel === 'prorated' ? 'Pro-ratë' : commission.paymentModel === 'flat' ? 'Fiks' : 'Orar'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="text-xs text-gray-500">Seanca (Planif./Mbajt.)</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {commission.sessionsPlanned} / {commission.sessionsHeld}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="text-xs text-gray-500">Klientë × Shuma</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {commission.clientCount} × {eur(commission.ratePerClient)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="text-xs text-gray-500">Totali</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{eur(commission.totalAmount)}</p>
            </div>
          </div>
          {commission.bonus > 0 && (
            <p className="mt-3 text-xs text-green-600">+ Bonus: {eur(commission.bonus)}</p>
          )}
          {commission.deductions > 0 && (
            <p className="mt-1 text-xs text-red-600">- Zbritje: {eur(commission.deductions)}</p>
          )}
        </Panel>
      )}
    </DashboardShell>
  )
}

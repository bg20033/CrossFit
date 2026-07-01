import { CalendarDays, CheckCircle, Dumbbell, Flame, QrCode, Target, Ticket, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  QuickAction,
  EmptyState,
  Badge,
  RingChart,
  StreakBadge,
  ActionCard,
  MetricTile,
} from '../components/DashboardKit'

interface Goal {
  id: number
  title: string
  type?: string
  status: string
  targetDate?: string
  daysRemaining?: number
}

export default function ClientDashboard() {
  const { user, profileId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [counts, setCounts] = useState({ workouts: 0, diets: 0 })
  const [att, setAtt] = useState({ rate: 0, week: 0, month: 0, streak: 0 })

  useEffect(() => {
    if (profileId == null) return
    api.get(`/attendance/client-summary?clientId=${profileId}`).then((r) => {
      setAtt({ rate: r.data?.attendanceRate ?? 0, week: r.data?.totalThisWeek ?? 0, month: r.data?.totalThisMonth ?? 0, streak: r.data?.currentStreak ?? 0 })
    }).catch(() => {})
  }, [profileId])

  useEffect(() => {
    let active = true
    const cid = profileId ? `&clientId=${profileId}` : ''
    const load = async () => {
      const results = await Promise.allSettled([
        api.get(`/goals${profileId ? `?clientId=${profileId}` : ''}`),
        api.get(`/workoutplans?page=1&pageSize=1${cid}`),
        api.get(`/dietplans${profileId ? `?clientId=${profileId}` : ''}`),
      ])
      if (!active) return
      const val = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.data : null)
      setGoals(Array.isArray(val(0)) ? val(0) : [])
      setCounts({
        workouts: val(1)?.total ?? 0,
        diets: Array.isArray(val(2)) ? val(2).length : 0,
      })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [profileId])

  const activeGoals = goals.filter((g) => (g.status || '').toLowerCase() === 'in_progress')

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title={`Mirë se erdhe, ${user?.name?.split(' ')[0] || 'Klient'}`}
        subtitle="Ndiq planin tënd, dietën dhe qëllimet e tua të fitnesit."
        right={att.streak > 0 ? <StreakBadge days={att.streak} label="ditë" /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard variant="coral" emoji={<Dumbbell className="h-5 w-5" />} title="Stërvitja sot" subtitle={`${counts.workouts} plane aktive`} cta="Hap planin" to="/workouts" />
        <ActionCard variant="purple" emoji={<UtensilsCrossed className="h-5 w-5" />} title="Dieta ime" subtitle={`${counts.diets} plane ushqimi`} cta="Shiko dietën" to="/diet" />
        <ActionCard variant="dark" emoji={<Ticket className="h-5 w-5" />} title="Anëtarësimi" subtitle="Statusi & rinovimi" cta="Shiko detajet" to="/package" />
        <ActionCard variant="teal" emoji={<Target className="h-5 w-5" />} title="Qëllimet" subtitle={`${activeGoals.length} aktive`} cta="Ndiq progresin" to="/goals" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile icon={<Flame className="h-5 w-5" />} label="Streak aktual" value={loading ? '…' : `${att.streak} ditë`} done={att.streak > 0} />
        <MetricTile icon={<CalendarDays className="h-5 w-5" />} label="Vizita këtë javë" value={loading ? '…' : att.week} />
        <MetricTile icon={<CalendarDays className="h-5 w-5" />} label="Vizita këtë muaj" value={loading ? '…' : att.month} />
        <MetricTile icon={<CheckCircle className="h-5 w-5" />} label="Anëtarësimi" value="Aktiv" sub="Status" done />
      </div>

      <Panel title="Rregullsia ime">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <RingChart value={att.rate} label="Rregullsia këtë muaj" sub={`${att.month} vizita gjithsej`} />
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">{att.week}</p>
              <p className="text-xs text-gray-400">këtë javë</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{att.month}</p>
              <p className="text-xs text-gray-400">këtë muaj</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{att.streak}</p>
              <p className="text-xs text-gray-400">vazhdimësi (ditë)</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          Shiko detajet te <a href="/calendar" className="font-medium text-gray-600 hover:underline">Kalendari</a>.
        </p>
      </Panel>

      <Panel title="Aksione të shpejta">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <QuickAction to="/qr-card" icon={<QrCode className="h-5 w-5" />} label="Kartela QR" />
          <QuickAction to="/workouts" icon={<Dumbbell className="h-5 w-5" />} label="Ushtrimet e mia" accent="purple" />
          <QuickAction to="/diet" icon={<UtensilsCrossed className="h-5 w-5" />} label="Dieta ime" accent="orange" />
          <QuickAction to="/package" icon={<Ticket className="h-5 w-5" />} label="Anëtarësimi" />
          <QuickAction to="/goals" icon={<Target className="h-5 w-5" />} label="Qëllimet" accent="blue" />
        </div>
      </Panel>

      <Panel title="Qëllimet e mia" action={<Badge accent="blue">{activeGoals.length} aktive</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : goals.length === 0 ? (
          <EmptyState icon={<Target className="h-5 w-5" />} text="Ende s'ke qëllime. Trajneri yt mund të caktojë një, ose shtoji te Qëllimet." />
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 6).map((g) => {
              const done = (g.status || '').toLowerCase() === 'completed'
              return (
                <div key={g.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-800">{g.title}</p>
                    <p className="text-xs text-gray-400">
                      {g.type ? g.type.replace(/_/g, ' ') + ' · ' : ''}
                      Afati: {shortDate(g.targetDate)}
                    </p>
                  </div>
                  {done ? (
                    <Badge accent="green">Përfunduar</Badge>
                  ) : (
                    <Badge accent={(g.daysRemaining ?? 1) < 0 ? 'red' : 'orange'}>
                      {(g.daysRemaining ?? 0) < 0 ? 'Skaduar' : `${g.daysRemaining ?? 0} ditë`}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

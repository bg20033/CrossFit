import { CalendarDays, Dumbbell, Library, Users, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  QuickAction,
  EmptyState,
  Badge,
  BarList,
} from '../components/DashboardKit'

interface Group {
  id: number
  name: string
  dayOfWeek?: string | number
  scheduleStart?: string
  scheduleEnd?: string
  maxCapacity?: number
  membersCount?: number
}

const DAYS = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë']

function dayLabel(d: string | number | undefined): string {
  if (d === undefined || d === null) return '—'
  if (typeof d === 'number') return DAYS[d] ?? String(d)
  return d
}
function hhmm(t?: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export default function TrainerDashboard() {
  const { user, profileId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [counts, setCounts] = useState({ workouts: 0, diets: 0, goals: 0 })

  useEffect(() => {
    let active = true
    const tid = profileId ? `&trainerId=${profileId}` : ''
    const load = async () => {
      const results = await Promise.allSettled([
        api.get(`/traininggroups${profileId ? `?trainerId=${profileId}` : ''}`),
        api.get(`/workoutplans?page=1&pageSize=1${tid}`),
        api.get(`/dietplans${profileId ? `?trainerId=${profileId}` : ''}`),
        api.get('/goals'),
      ])
      if (!active) return
      const val = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.data : null)
      const g = Array.isArray(val(0)) ? val(0) : []
      setGroups(g)
      setCounts({
        workouts: val(1)?.total ?? 0,
        diets: Array.isArray(val(2)) ? val(2).length : 0,
        goals: Array.isArray(val(3)) ? val(3).length : 0,
      })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [profileId])

  const totalMembers = groups.reduce((s, g) => s + (g.membersCount ?? 0), 0)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Trajner"
        title={`Përshëndetje, ${user?.name?.split(' ')[0] || 'Trajner'}`}
        subtitle="Grupet, planet e ushtrimeve dhe klientët e tu në një vend."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-5 w-5" />} accent="green" label="Grupet e mia" value={loading ? '…' : groups.length} />
        <StatCard icon={<Users className="h-5 w-5" />} accent="blue" label="Anëtarë gjithsej" value={loading ? '…' : totalMembers} />
        <StatCard icon={<Dumbbell className="h-5 w-5" />} accent="purple" label="Plane ushtrimesh" value={loading ? '…' : counts.workouts} />
        <StatCard icon={<UtensilsCrossed className="h-5 w-5" />} accent="orange" label="Plane diete" value={loading ? '…' : counts.diets} />
      </div>

      <Panel title="Aksione të shpejta">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/trainer/groups" icon={<Library className="h-5 w-5" />} label="Grupet" accent="green" />
          <QuickAction to="/trainer/workout-builder" icon={<Dumbbell className="h-5 w-5" />} label="Krijo Ushtrime" accent="purple" />
          <QuickAction to="/trainer/diets" icon={<UtensilsCrossed className="h-5 w-5" />} label="Dietat" accent="orange" />
          <QuickAction to="/trainer/clients" icon={<Users className="h-5 w-5" />} label="Klientët" accent="blue" />
        </div>
      </Panel>

      {groups.length > 0 && (
        <Panel title="Mbushja e grupeve">
          <BarList items={groups.map((g) => ({ label: g.name, value: g.membersCount ?? 0, hint: `${g.membersCount ?? 0}/${g.maxCapacity ?? '∞'}` }))} />
        </Panel>
      )}

      <Panel title="Grupet e mia" action={<Badge accent="teal">{groups.length} grupe</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Ende s'ke grupe. Krijo një te seksioni Grupet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Grupi</th>
                  <th className="px-3 py-2 font-semibold">Dita</th>
                  <th className="px-3 py-2 font-semibold">Orari</th>
                  <th className="px-3 py-2 font-semibold">Anëtarë</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groups.map((g) => {
                  const full = (g.membersCount ?? 0) >= (g.maxCapacity ?? Infinity)
                  return (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">{g.name}</td>
                      <td className="px-3 py-3 text-gray-600">{dayLabel(g.dayOfWeek)}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {hhmm(g.scheduleStart)}
                        {g.scheduleEnd ? ` – ${hhmm(g.scheduleEnd)}` : ''}
                      </td>
                      <td className="px-3 py-3">
                        <Badge accent={full ? 'red' : 'green'}>
                          {g.membersCount ?? 0}/{g.maxCapacity ?? '∞'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  EmptyState,
  Badge,
} from '../components/DashboardKit'

interface Goal {
  id: number
  title: string
  description: string
  type: string
  targetDate: string
  status: string
  daysRemaining: number
  createdAt: string
}
interface Stats {
  total: number
  completed: number
  inProgress: number
  successRatePercent: number
}

const TYPE_EMOJI: Record<string, string> = {
  weight_loss: '⬇️', muscle_gain: '💪', strength: '🏋️', endurance: '🏃', flexibility: '🧘',
}
const FILTERS = [
  { key: 'all', label: 'Të gjitha' },
  { key: 'in_progress', label: 'Në progres' },
  { key: 'completed', label: 'Përfunduar' },
  { key: 'abandoned', label: 'Braktisur' },
]

export default function ClientGoals() {
  const { profileId } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (profileId == null) return
    load()
  }, [profileId])

  const load = async () => {
    try {
      setLoading(true)
      const [g, s] = await Promise.allSettled([
        api.get(`/goals?clientId=${profileId}`),
        api.get(`/goals/stats/${profileId}`),
      ])
      if (g.status === 'fulfilled') setGoals(g.value.data || [])
      if (s.status === 'fulfilled') setStats(s.value.data)
    } finally {
      setLoading(false)
    }
  }

  const act = async (id: number, action: 'complete' | 'abandon') => {
    try {
      await api.post(`/goals/${id}/${action}`)
      load()
    } catch {
      /* ignore */
    }
  }

  const filtered = filter === 'all' ? goals : goals.filter((g) => g.status === filter)

  return (
    <DashboardShell>
      <DashboardHeader badge="Klient" title="Qëllimet e mia" subtitle="Ndiq progresin drejt objektivave të tua." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🎯" label="Të gjitha" value={stats?.total ?? 0} />
        <StatCard icon="✅" label="Përfunduar" value={stats?.completed ?? 0} />
        <StatCard icon="⏳" label="Në progres" value={stats?.inProgress ?? 0} />
        <StatCard icon="📈" label="Sukses" value={`${stats?.successRatePercent ?? 0}%`} />
      </div>

      <Panel
        title="Lista e qëllimeve"
        action={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🎯" text="S'ka qëllime në këtë kategori." />
        ) : (
          <div className="space-y-3">
            {filtered.map((g) => {
              const inProgress = g.status === 'in_progress'
              const expired = g.daysRemaining < 0
              return (
                <div key={g.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {TYPE_EMOJI[g.type] || '🎯'} {g.title}
                      </h3>
                      {g.description && <p className="mt-0.5 text-sm text-gray-500">{g.description}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {g.type?.replace(/_/g, ' ')} · Afati: {shortDate(g.targetDate)}
                      </p>
                    </div>
                    <Badge accent={g.status === 'completed' ? 'green' : 'gray'}>
                      {g.status === 'completed' ? 'Përfunduar' : inProgress ? (expired ? 'Skaduar' : `${g.daysRemaining} ditë`) : 'Braktisur'}
                    </Badge>
                  </div>
                  {inProgress && (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => act(g.id, 'complete')} size="sm" className="bg-coral-500 text-white hover:bg-coral-600">
                        ✅ Përfundo
                      </Button>
                      <Button onClick={() => act(g.id, 'abandon')} size="sm" variant="outline">
                        ✕ Braktis
                      </Button>
                    </div>
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

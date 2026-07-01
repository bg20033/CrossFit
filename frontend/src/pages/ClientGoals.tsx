import { CheckCircle, Hourglass, Target, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import { parseDecimal } from '../utils/number'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  primaryBtn,
} from '../components/DashboardKit'

interface Goal {
  id: number
  title: string
  description: string
  type: string
  targetValue: number | null
  unit: string
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

// Goal categories with Albanian labels and a sensible default unit.
const GOAL_TYPES = [
  { key: 'weight_loss', label: 'Rënie në peshë', unit: 'kg' },
  { key: 'weight_gain', label: 'Shtim në peshë', unit: 'kg' },
  { key: 'muscle_gain', label: 'Masë muskulore', unit: 'kg' },
  { key: 'strength', label: 'Forcë (1RM)', unit: 'kg' },
  { key: 'endurance', label: 'Qëndrueshmëri', unit: 'min' },
  { key: 'benchmark', label: 'Rekord WOD (leaderboard)', unit: '' },
  { key: 'flexibility', label: 'Fleksibilitet', unit: '' },
  { key: 'other', label: 'Tjetër', unit: '' },
]
const TYPE_LABEL: Record<string, string> = Object.fromEntries(GOAL_TYPES.map((t) => [t.key, t.label]))

const FILTERS = [
  { key: 'all', label: 'Të gjitha' },
  { key: 'in_progress', label: 'Në progres' },
  { key: 'completed', label: 'Përfunduar' },
  { key: 'abandoned', label: 'Braktisur' },
]

const emptyForm = () => ({ title: '', type: 'weight_loss', targetValue: '', unit: 'kg', targetDate: '', description: '' })

export default function ClientGoals() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())

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

  // Selecting a type pre-fills the matching unit (still editable).
  const pickType = (key: string) => {
    const unit = GOAL_TYPES.find((t) => t.key === key)?.unit ?? ''
    setForm((f) => ({ ...f, type: key, unit }))
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileId == null) return
    if (!form.title.trim()) {
      addNotification('Gabim', 'Shkruaj një titull për qëllimin.', 'error')
      return
    }
    if (!form.targetDate) {
      addNotification('Gabim', 'Zgjedh një afat (datë) për qëllimin.', 'error')
      return
    }
    try {
      await api.post('/goals/create', {
        clientId: profileId,
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        targetValue: parseDecimal(form.targetValue),
        unit: form.unit.trim(),
        targetDate: new Date(form.targetDate).toISOString(),
      })
      setShowForm(false)
      setForm(emptyForm())
      addNotification('Sukses', 'Qëllimi u shtua.', 'success')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Shtimi i qëllimit dështoi.', 'error')
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
  const today = new Date().toISOString().slice(0, 10)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title="Qëllimet e mia"
        subtitle="Cakto ku synon të arrish dhe ndiq progresin drejt objektivave."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Shto qëllim'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Target className="h-5 w-5" />} label="Të gjitha" value={stats?.total ?? 0} />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Përfunduar" value={stats?.completed ?? 0} />
        <StatCard icon={<Hourglass className="h-5 w-5" />} label="Në progres" value={stats?.inProgress ?? 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Sukses" value={`${stats?.successRatePercent ?? 0}%`} />
      </div>

      {showForm && (
        <Panel title="Shto qëllim të ri">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Titulli">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="p.sh. Arrij 75 kg"
                  className={fieldCls}
                />
              </Field>
              <Field label="Lloji">
                <select value={form.type} onChange={(e) => pickType(e.target.value)} className={fieldCls}>
                  {GOAL_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Objektivi (ku synon)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.targetValue}
                  onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                  placeholder="p.sh. 75"
                  className={fieldCls}
                />
              </Field>
              <Field label="Njësia">
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="kg, min, reps…"
                  className={fieldCls}
                />
              </Field>
              <Field label="Afati">
                <input
                  type="date"
                  min={today}
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                  required
                  className={fieldCls}
                />
              </Field>
            </div>
            <Field label="Përshkrimi (opsional)">
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="p.sh. me dietë dhe 4 stërvitje në javë"
                className={fieldCls}
              />
            </Field>
            <Button type="submit" className={primaryBtn}>Ruaj qëllimin</Button>
          </form>
        </Panel>
      )}

      <Panel
        title="Lista e qëllimeve"
        action={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.key ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
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
          <EmptyState icon={<Target className="h-5 w-5" />} text="S'ka qëllime në këtë kategori. Shto të parin me '+ Shto qëllim'." />
        ) : (
          <div className="space-y-3">
            {filtered.map((g) => {
              const inProgress = g.status === 'in_progress'
              const expired = g.daysRemaining < 0
              return (
                <div key={g.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{g.title}</h3>
                      {g.targetValue != null && (
                        <p className="mt-0.5 text-sm font-semibold text-coral-600">
                          Synon: {g.targetValue}{g.unit ? ` ${g.unit}` : ''}
                        </p>
                      )}
                      {g.description && <p className="mt-0.5 text-sm text-gray-500">{g.description}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {TYPE_LABEL[g.type] ?? g.type?.replace(/_/g, ' ')} · Afati: {shortDate(g.targetDate)}
                      </p>
                    </div>
                    <Badge accent={g.status === 'completed' ? 'green' : 'gray'}>
                      {g.status === 'completed' ? 'Përfunduar' : inProgress ? (expired ? 'Skaduar' : `${g.daysRemaining} ditë`) : 'Braktisur'}
                    </Badge>
                  </div>
                  {inProgress && (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => act(g.id, 'complete')} size="sm" className="bg-coral-500 text-white hover:bg-coral-600">
                        Përfundo
                      </Button>
                      <Button onClick={() => act(g.id, 'abandon')} size="sm" variant="outline">
                        Braktis
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

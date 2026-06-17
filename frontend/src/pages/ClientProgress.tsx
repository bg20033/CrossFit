import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  primaryBtn,
} from '../components/DashboardKit'

interface Log {
  id: number
  date: string
  weight: number
  chest: number | null
  waist: number | null
  hips: number | null
  notes: string
}

const empty = { weight: '', chest: '', waist: '', hips: '', notes: '' }

function WeightChart({ logs }: { logs: Log[] }) {
  const pts = [...logs].reverse() // oldest -> newest
  if (pts.length < 2) {
    return <p className="py-8 text-center text-sm text-gray-400">Shto të paktën 2 matje për të parë grafikun.</p>
  }
  const w = 600
  const h = 180
  const pad = 24
  const weights = pts.map((p) => Number(p.weight))
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (pts.length - 1)
  const y = (val: number) => pad + (h - 2 * pad) * (1 - (val - min) / range)
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(Number(p.weight))}`).join(' ')
  const area = `${path} L ${x(pts.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB5A5C" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FB5A5C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#weightFill)" stroke="none" />
      <path d={path} fill="none" stroke="#FB5A5C" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(Number(p.weight))} r="3.5" fill="#FB5A5C" />
          <text x={x(i)} y={y(Number(p.weight)) - 8} textAnchor="middle" className="fill-gray-500" fontSize="10">
            {Number(p.weight)}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function ClientProgress() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (profileId == null) return
    fetchLogs()
  }, [profileId])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/progress?clientId=${profileId}`)
      setLogs(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/progress', {
        clientId: profileId,
        weight: parseFloat(form.weight),
        chest: form.chest ? parseFloat(form.chest) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        hips: form.hips ? parseFloat(form.hips) : null,
        notes: form.notes,
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Matja u shtua.', 'success')
      fetchLogs()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Shtimi dështoi.', 'error')
    }
  }

  const remove = async (id: number) => {
    try {
      await api.delete(`/progress/${id}`)
      fetchLogs()
    } catch {
      /* ignore */
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const latest = logs[0]?.weight
  const first = logs[logs.length - 1]?.weight
  const delta = latest != null && first != null ? Number(latest) - Number(first) : null

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title="Progresi im"
        subtitle="Ndiq peshën dhe matjet me kalimin e kohës."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Shto matje'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon="⚖️" label="Pesha aktuale" value={latest != null ? `${latest} kg` : '—'} />
        <StatCard icon="📉" label="Ndryshimi" value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg` : '—'} />
        <StatCard icon="🗓️" label="Matje" value={logs.length} />
      </div>

      {showForm && (
        <Panel title="Shto matje">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Pesha (kg)"><input type="number" step="0.1" name="weight" value={form.weight} onChange={change} required className={fieldCls} /></Field>
              <Field label="Kraharori (cm)"><input type="number" step="0.1" name="chest" value={form.chest} onChange={change} className={fieldCls} /></Field>
              <Field label="Beli (cm)"><input type="number" step="0.1" name="waist" value={form.waist} onChange={change} className={fieldCls} /></Field>
              <Field label="Ijet (cm)"><input type="number" step="0.1" name="hips" value={form.hips} onChange={change} className={fieldCls} /></Field>
            </div>
            <Field label="Shënime"><input name="notes" value={form.notes} onChange={change} className={fieldCls} /></Field>
            <Button type="submit" className={primaryBtn}>Ruaj matjen</Button>
          </form>
        </Panel>
      )}

      <Panel title="Grafiku i peshës">
        {loading ? <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p> : <WeightChart logs={logs} />}
      </Panel>

      <Panel title="Historiku">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon="📈" text="Ende s'ke matje. Shto të parën me '+ Shto matje'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Data</th>
                  <th className="px-3 py-2 font-semibold">Pesha</th>
                  <th className="px-3 py-2 font-semibold">Kraharori</th>
                  <th className="px-3 py-2 font-semibold">Beli</th>
                  <th className="px-3 py-2 font-semibold">Ijet</th>
                  <th className="px-3 py-2 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600">{shortDate(l.date)}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{l.weight} kg</td>
                    <td className="px-3 py-3 text-gray-600">{l.chest ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.waist ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.hips ?? '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => remove(l.id)} className="text-gray-400 hover:text-gray-700">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

import { CalendarDays, Percent, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
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
  primaryBtn,
} from '../components/DashboardKit'
import MuscleBodyMap from '../components/MuscleBodyMap'
import ProgressPhotos from '../components/ProgressPhotos'

interface Log {
  id: number
  date: string
  weight: number
  chest: number | null
  waist: number | null
  hips: number | null
  arms: number | null
  thighs: number | null
  calves: number | null
  shoulders: number | null
  back: number | null
  bodyFat: number | null
  notes: string
}

const empty = {
  weight: '',
  chest: '',
  waist: '',
  hips: '',
  arms: '',
  thighs: '',
  calves: '',
  shoulders: '',
  back: '',
  bodyFat: '',
  notes: '',
}

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
          <stop offset="0%" stopColor="#EE3A24" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#EE3A24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#weightFill)" stroke="none" />
      <path d={path} fill="none" stroke="#EE3A24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(Number(p.weight))} r="3.5" fill="#EE3A24" />
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
      const res = await api.get('/progress', { params: { clientId: profileId, _: Date.now() } })
      setLogs(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const weight = parseDecimal(form.weight)
    if (weight == null || weight <= 0) {
      addNotification('Gabim', 'Shkruaj një peshë të vlefshme (p.sh. 75 ose 75,5).', 'error')
      return
    }
    try {
      await api.post('/progress', {
        clientId: profileId,
        weight,
        chest: parseDecimal(form.chest),
        waist: parseDecimal(form.waist),
        hips: parseDecimal(form.hips),
        arms: parseDecimal(form.arms),
        thighs: parseDecimal(form.thighs),
        calves: parseDecimal(form.calves),
        shoulders: parseDecimal(form.shoulders),
        back: parseDecimal(form.back),
        bodyFat: parseDecimal(form.bodyFat),
        notes: form.notes,
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Matja u shtua.', 'success')
      await fetchLogs()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Shtimi dështoi.', 'error')
    }
  }

  const remove = async (id: number) => {
    try {
      await api.delete(`/progress/${id}`)
      await fetchLogs()
    } catch {
      /* ignore */
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const latest = logs[0]?.weight
  const first = logs[logs.length - 1]?.weight
  const delta = latest != null && first != null ? Number(latest) - Number(first) : null

  const latestBf = logs[0]?.bodyFat
  const firstBf = [...logs].reverse().find((l) => l.bodyFat != null)?.bodyFat ?? null
  const bfDelta = latestBf != null && firstBf != null ? Number(latestBf) - Number(firstBf) : null

  // Real trends for the body map: compare the latest log to the previous one.
  const prev = logs[1]
  const trendOf = (cur?: number | null, before?: number | null): 'up' | 'down' | 'stable' =>
    cur == null || before == null ? 'stable' : cur > before ? 'up' : cur < before ? 'down' : 'stable'
  const m0 = logs[0]
  const region = (val?: number | null, before?: number | null) =>
    val != null ? { value: val, unit: 'cm', trend: trendOf(val, before) } : undefined
  const bodyMeasurements = {
    ...(region(m0?.chest, prev?.chest) ? { chest: region(m0?.chest, prev?.chest)! } : {}),
    ...(region(m0?.waist, prev?.waist) ? { waist: region(m0?.waist, prev?.waist)! } : {}),
    ...(region(m0?.hips, prev?.hips) ? { hips: region(m0?.hips, prev?.hips)! } : {}),
    ...(region(m0?.arms, prev?.arms) ? { arms: region(m0?.arms, prev?.arms)! } : {}),
    ...(region(m0?.thighs, prev?.thighs) ? { thighs: region(m0?.thighs, prev?.thighs)! } : {}),
    ...(region(m0?.calves, prev?.calves) ? { calves: region(m0?.calves, prev?.calves)! } : {}),
    ...(region(m0?.shoulders, prev?.shoulders) ? { shoulders: region(m0?.shoulders, prev?.shoulders)! } : {}),
    ...(region(m0?.back, prev?.back) ? { back: region(m0?.back, prev?.back)! } : {}),
  }

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Scale className="h-5 w-5" />} label="Pesha aktuale" value={latest != null ? `${latest} kg` : '—'} />
        <StatCard
          icon={delta != null && delta > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          label="Ndryshimi i peshës"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg` : '—'}
        />
        <StatCard
          icon={<Percent className="h-5 w-5" />}
          label="Yndyra trupore"
          value={latestBf != null ? `${latestBf}%` : '—'}
          sub={bfDelta != null ? `${bfDelta > 0 ? '+' : ''}${bfDelta.toFixed(1)}% nga fillimi` : undefined}
        />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Matje totale" value={logs.length} />
      </div>

      {showForm && (
        <Panel title="Shto matje">
          <form onSubmit={create} className="space-y-5">
            <div>
              <p className="label-mono mb-2">Pesha & përbërja</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pesha (kg)"><input type="text" inputMode="decimal" name="weight" value={form.weight} onChange={change} required className={fieldCls} /></Field>
                <Field label="Yndyra trupore (%)"><input type="text" inputMode="decimal" name="bodyFat" value={form.bodyFat} onChange={change} className={fieldCls} /></Field>
              </div>
            </div>
            <div>
              <p className="label-mono mb-2">Perimetrat (cm)</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Kraharori"><input type="text" inputMode="decimal" name="chest" value={form.chest} onChange={change} className={fieldCls} /></Field>
                <Field label="Beli"><input type="text" inputMode="decimal" name="waist" value={form.waist} onChange={change} className={fieldCls} /></Field>
                <Field label="Ijet"><input type="text" inputMode="decimal" name="hips" value={form.hips} onChange={change} className={fieldCls} /></Field>
                <Field label="Krahët"><input type="text" inputMode="decimal" name="arms" value={form.arms} onChange={change} className={fieldCls} /></Field>
                <Field label="Kofshët"><input type="text" inputMode="decimal" name="thighs" value={form.thighs} onChange={change} className={fieldCls} /></Field>
                <Field label="Kërcëllat"><input type="text" inputMode="decimal" name="calves" value={form.calves} onChange={change} className={fieldCls} /></Field>
                <Field label="Shpatullat"><input type="text" inputMode="decimal" name="shoulders" value={form.shoulders} onChange={change} className={fieldCls} /></Field>
                <Field label="Shpina"><input type="text" inputMode="decimal" name="back" value={form.back} onChange={change} className={fieldCls} /></Field>
              </div>
            </div>
            <Field label="Shënime"><input name="notes" value={form.notes} onChange={change} placeholder="p.sh. ndihem më fort, gjumi mirë…" className={fieldCls} /></Field>
            <Button type="submit" className={primaryBtn}>Ruaj matjen</Button>
          </form>
        </Panel>
      )}

      <Panel title="Grafiku i peshës">
        {loading ? <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p> : <WeightChart logs={logs} />}
      </Panel>

      <Panel title="Trupi — Matjet sipas muskujve">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : (
          <MuscleBodyMap measurements={bodyMeasurements} gender="male" showBothSides />
        )}
      </Panel>

      {profileId != null && <ProgressPhotos clientId={profileId} />}

      <Panel title="Historiku">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon={<TrendingUp className="h-5 w-5" />} text="Ende s'ke matje. Shto të parën me '+ Shto matje'." />
        ) : (
          <>
          {/* Mobile: one card per measurement (the table is unreadable on phones) */}
          <div className="space-y-3 md:hidden">
            {logs.map((l) => {
              const rows: [string, number | null][] = [
                ['Kraharori', l.chest], ['Beli', l.waist], ['Ijet', l.hips], ['Krahët', l.arms],
                ['Kofshët', l.thighs], ['Kërcëllat', l.calves], ['Shpatullat', l.shoulders], ['Shpina', l.back],
              ]
              const shown = rows.filter(([, v]) => v != null)
              return (
                <div key={l.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-400">{shortDate(l.date)}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {l.weight} kg{l.bodyFat != null ? <span className="text-sm font-normal text-gray-500"> · {l.bodyFat}% yndyrë</span> : null}
                      </p>
                    </div>
                    <button onClick={() => remove(l.id)} aria-label="Fshij" className="p-1 text-gray-400 hover:text-coral-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {shown.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      {shown.map(([label, v]) => (
                        <div key={label} className="flex justify-between">
                          <dt className="text-gray-400">{label}</dt>
                          <dd className="font-medium text-gray-700">{v} cm</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {l.notes && <p className="mt-2 text-xs text-gray-500">{l.notes}</p>}
                </div>
              )
            })}
          </div>

          {/* Desktop: full table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Data</th>
                  <th className="px-3 py-2 font-semibold">Pesha</th>
                  <th className="px-3 py-2 font-semibold">Kraharori</th>
                  <th className="px-3 py-2 font-semibold">Beli</th>
                  <th className="px-3 py-2 font-semibold">Ijet</th>
                  <th className="px-3 py-2 font-semibold">Krahët</th>
                  <th className="px-3 py-2 font-semibold">Kofshët</th>
                  <th className="px-3 py-2 font-semibold">Kërcëllat</th>
                  <th className="px-3 py-2 font-semibold">Shpatullat</th>
                  <th className="px-3 py-2 font-semibold">Shpina</th>
                  <th className="px-3 py-2 font-semibold">Yndyra %</th>
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
                    <td className="px-3 py-3 text-gray-600">{l.arms ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.thighs ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.calves ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.shoulders ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.back ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.bodyFat != null ? `${l.bodyFat}%` : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => remove(l.id)} className="text-gray-400 hover:text-gray-700">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panel>
    </DashboardShell>
  )
}

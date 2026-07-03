import { Trophy, Flame, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  StatCard,
  Field,
  fieldCls,
  primaryBtn,
} from '../components/DashboardKit'
import {
  EXERCISES,
  exerciseByKey,
  useLeaderboard,
  formatScore,
  registeredAtLabel,
} from '../features/leaderboard/leaderboardStore'
import { shortDate } from '../utils/format'

export default function ClientLeaderboard() {
  const { addNotification } = useNotification()
  const { prs, addPr, removePr, prsFor, bestFor, hydrate } = useLeaderboard()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const [selected, setSelected] = useState(EXERCISES[0].key)
  const ex = exerciseByKey(selected) ?? EXERCISES[0]

  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const myBest = bestFor(selected)
  const history = prsFor(selected)

  const totalPrs = prs.length
  const trackedExercises = new Set(prs.map((p) => p.exercise)).size

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = weight.trim() === '' ? 0 : Number(weight)
    const r = Number(reps)
    if (Number.isNaN(w) || w < 0) {
      addNotification('Gabim', 'Pesha duhet të jetë numër (kg) — 0 për trup të lirë.', 'error')
      return
    }
    if (!Number.isInteger(r) || r < 1) {
      addNotification('Gabim', 'Vendos përsëritjet (së paku 1).', 'error')
      return
    }
    if (!ex.bodyweight && w <= 0) {
      addNotification('Gabim', `Vendos peshën për ${ex.name}.`, 'error')
      return
    }
    const prevBest = myBest
    try {
      const saved = await addPr({ exercise: selected, weightKg: w, reps: r, date })
      setWeight('')
      setReps('')
      const improved =
        prevBest == null || saved.weightKg > prevBest.weightKg ||
        (saved.weightKg === prevBest.weightKg && saved.reps > prevBest.reps)
      addNotification(
        improved ? 'Rekord i ri!' : 'U ruajt',
        `${ex.name}: ${formatScore(saved, ex.bodyweight)}${improved ? ' — rekordi yt më i mirë!' : ''}`,
        improved ? 'success' : 'info'
      )
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Rezultati nuk u ruajt në server.', 'error')
    }
  }

  const deletePr = async (id: string) => {
    try {
      await removePr(id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Rezultati nuk u fshi nga serveri.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Rekordet e mia"
        title="Rekordet e Ngritjeve"
        subtitle="Peshë × përsëritje për çdo ushtrim bazë — vetëm rezultatet e tua janë këtu."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Trophy className="h-5 w-5" />} label="PR të regjistruara" value={totalPrs} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Ushtrime të ndjekura" value={trackedExercises} />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label={`PB ${ex.name}`}
          value={myBest ? formatScore(myBest, ex.bodyweight) : '—'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {EXERCISES.map((e) => (
          <button
            key={e.key}
            onClick={() => { setSelected(e.key); setWeight(''); setReps('') }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selected === e.key ? 'bg-coral-500 text-white' : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-coral-300'
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        <Panel title={ex.name}>
          <p className="text-sm text-gray-500">
            {ex.bodyweight
              ? 'Ushtrim me peshë trupore — shëno përsëritjet; peshën shtesë vetëm nëse punon me rëndesë (p.sh. pull-ups me 10 kg).'
              : 'Shëno peshën dhe përsëritjet e serisë më të mirë (p.sh. 100 kg × 5).'}
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label={ex.bodyweight ? 'Pesha shtesë (kg, opsionale)' : 'Pesha (kg)'}>
                <input
                  className={fieldCls}
                  type="number"
                  min={0}
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={ex.bodyweight ? '0 = trup i lirë' : 'p.sh. 100'}
                  required={!ex.bodyweight}
                />
              </Field>
              <Field label="Përsëritjet (reps)">
                <input
                  className={fieldCls}
                  type="number"
                  min={1}
                  step="1"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="p.sh. 5"
                  required
                />
              </Field>
              <Field label="Data e stërvitjes">
                <input className={fieldCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <button type="submit" className={primaryBtn}>+ Regjistro rezultatin</button>
          </form>

          <p className="label-mono mt-5">Historiku im</p>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Ende s'ke rezultate për {ex.name}.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {history.map((p) => {
                const best = myBest?.id === p.id
                const registered = registeredAtLabel(p.createdAt)
                return (
                  <div key={p.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${best ? 'border-coral-200 bg-coral-50' : 'border-gray-100'}`}>
                    <div className="min-w-0">
                      <span className="text-sm text-gray-600">{shortDate(p.date)}</span>
                      {registered && (
                        <p className="truncate text-[11px] text-gray-400">regjistruar më {registered}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="nums text-sm font-semibold text-gray-900">{formatScore(p, ex.bodyweight)}</span>
                      {best && <span className="rounded bg-coral-500 px-1.5 py-0.5 text-[9px] font-bold text-white">PB</span>}
                      <button onClick={() => deletePr(p.id)} className="text-gray-300 hover:text-coral-600" aria-label="Fshij">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  )
}

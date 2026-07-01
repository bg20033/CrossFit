import { Trophy, Medal, Flame, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  StatCard,
  EmptyState,
  Field,
  fieldCls,
  primaryBtn,
} from '../components/DashboardKit'
import {
  BENCHMARKS,
  benchmarkByKey,
  useLeaderboard,
  formatScore,
  parseScore,
  buildBoard,
} from '../features/leaderboard/leaderboardStore'
import { shortDate } from '../utils/format'

export default function ClientLeaderboard() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const { prs, community, addPr, removePr, prsFor, bestFor, hydrate } = useLeaderboard()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const [cat, setCat] = useState<'WOD' | 'Lift'>('WOD')
  const list = BENCHMARKS.filter((b) => b.category === cat)
  const [selected, setSelected] = useState(list[0].key)
  const bm = benchmarkByKey(selected) ?? BENCHMARKS[0]

  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const myBest = bestFor(selected)
  const history = prsFor(selected)
  const board = useMemo(
    () => buildBoard(selected, community, myBest?.value ?? null, user?.name?.split(' ')[0] || 'Ti'),
    [selected, community, myBest, user]
  )
  const myRank = board.findIndex((r) => r.isMe)

  const totalPrs = prs.length
  const trackedBenchmarks = new Set(prs.map((p) => p.benchmark)).size

  const onCat = (c: 'WOD' | 'Lift') => {
    setCat(c)
    setSelected(BENCHMARKS.find((b) => b.category === c)!.key)
    setValue('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseScore(bm.type, value)
    if (parsed == null) {
      addNotification('Gabim', bm.type === 'time' ? 'Përdor formatin mm:ss (p.sh. 3:45).' : 'Vendos një numër të vlefshëm.', 'error')
      return
    }
    const prevBest = myBest?.value ?? null
    try {
      await addPr({ benchmark: selected, value: parsed, date })
      setValue('')
      const improved =
        prevBest == null || (bm.type === 'time' ? parsed < prevBest : parsed > prevBest)
      addNotification(
        improved ? 'Rekord i ri!' : 'U ruajt',
        improved ? `${bm.name}: ${formatScore(bm.type, parsed)} - rekordi yt me i mire!` : `${bm.name}: ${formatScore(bm.type, parsed)}`,
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

  const placeholder = bm.type === 'time' ? 'mm:ss (p.sh. 3:45)' : bm.type === 'load' ? 'kg' : 'reps'

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Komuniteti"
        title="Leaderboard & Rekordet"
        subtitle="Ndiq rekordet personale (PR) dhe krahasohu me palestrën."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Trophy className="h-5 w-5" />} label="PR të regjistruara" value={totalPrs} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Benchmark të ndjekur" value={trackedBenchmarks} />
        <StatCard icon={<Medal className="h-5 w-5" />} label={`Rendi te ${bm.name}`} value={myRank >= 0 ? `#${myRank + 1}` : '—'} />
        <StatCard icon={<Trophy className="h-5 w-5" />} label={`PB ${bm.name}`} value={myBest ? formatScore(bm.type, myBest.value) : '—'} />
      </div>

      <div className="flex gap-2">
        {(['WOD', 'Lift'] as const).map((c) => (
          <button
            key={c}
            onClick={() => onCat(c)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              cat === c ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c === 'WOD' ? 'Benchmark WODs' : 'Ngritjet (Lifts)'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {list.map((b) => (
          <button
            key={b.key}
            onClick={() => { setSelected(b.key); setValue('') }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selected === b.key ? 'bg-coral-500 text-white' : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-coral-300'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title={bm.name} className="lg:col-span-2">
          <p className="text-sm text-gray-500">{bm.description}</p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Rezultati (${bm.type === 'time' ? 'kohë' : bm.type === 'load' ? 'kg' : 'reps'})`}>
                <input className={fieldCls} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} required />
              </Field>
              <Field label="Data">
                <input className={fieldCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <button type="submit" className={primaryBtn}>+ Regjistro rezultatin</button>
          </form>

          <p className="label-mono mt-5">Historiku im</p>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Ende s'ke rezultate për {bm.name}.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {history.map((p) => {
                const best = myBest?.id === p.id
                return (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${best ? 'border-coral-200 bg-coral-50' : 'border-gray-100'}`}>
                    <span className="text-sm text-gray-600">{shortDate(p.date)}</span>
                    <div className="flex items-center gap-3">
                      <span className="nums text-sm font-semibold text-gray-900">{formatScore(bm.type, p.value)}</span>
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

        <Panel title={`Tabela e palestrës — ${bm.name}`} className="lg:col-span-3">
          {board.length === 0 ? (
            <EmptyState icon={<Trophy className="h-5 w-5" />} text="S'ka ende rezultate për këtë benchmark." />
          ) : (
            <div className="space-y-1.5">
              {board.map((row, i) => (
                <div
                  key={`${row.athlete}-${i}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${row.isMe ? 'border border-coral-300 bg-coral-50' : 'border border-gray-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`text-sm font-medium ${row.isMe ? 'text-coral-700' : 'text-gray-800'}`}>{row.athlete}</span>
                  </div>
                  <span className="nums text-sm font-semibold text-gray-900">{formatScore(bm.type, row.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  )
}

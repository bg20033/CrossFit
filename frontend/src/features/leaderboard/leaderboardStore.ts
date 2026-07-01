import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'

/**
 * Leaderboard / PR tracker. Benchmark WODs + lifts with a personal-record log and
 * a gym-wide board sourced from the backend.
 */

// 'time' = lower is better (mm:ss); 'load' = heavier is better (kg); 'reps' = more is better.
export type ScoreType = 'time' | 'load' | 'reps'

export interface Benchmark {
  key: string
  name: string
  category: 'WOD' | 'Lift'
  type: ScoreType
  description: string
}

export const BENCHMARKS: Benchmark[] = [
  { key: 'fran', name: 'Fran', category: 'WOD', type: 'time', description: '21-15-9 Thrusters (43/30kg) & Pull-ups' },
  { key: 'grace', name: 'Grace', category: 'WOD', type: 'time', description: '30 Clean & Jerks (61/43kg)' },
  { key: 'helen', name: 'Helen', category: 'WOD', type: 'time', description: '3 rounds: 400m run, 21 KB swings, 12 pull-ups' },
  { key: 'diane', name: 'Diane', category: 'WOD', type: 'time', description: '21-15-9 Deadlifts (102/70kg) & HSPU' },
  { key: 'cindy', name: 'Cindy', category: 'WOD', type: 'reps', description: '20 min AMRAP: 5 pull-ups, 10 push-ups, 15 squats' },
  { key: 'murph', name: 'Murph', category: 'WOD', type: 'time', description: '1mi run, 100 pull-ups, 200 push-ups, 300 squats, 1mi run' },
  { key: 'backsquat', name: 'Back Squat 1RM', category: 'Lift', type: 'load', description: 'Një përsëritje maksimale' },
  { key: 'deadlift', name: 'Deadlift 1RM', category: 'Lift', type: 'load', description: 'Një përsëritje maksimale' },
  { key: 'clean', name: 'Clean 1RM', category: 'Lift', type: 'load', description: 'Një përsëritje maksimale' },
  { key: 'snatch', name: 'Snatch 1RM', category: 'Lift', type: 'load', description: 'Një përsëritje maksimale' },
  { key: 'press', name: 'Strict Press 1RM', category: 'Lift', type: 'load', description: 'Një përsëritje maksimale' },
]

export const benchmarkByKey = (key: string) => BENCHMARKS.find((b) => b.key === key)

export interface PrEntry {
  id: string
  serverId?: number
  benchmark: string // benchmark key
  /** Stored numerically: seconds for 'time', kg for 'load', reps for 'reps'. */
  value: number
  date: string // yyyy-mm-dd
  note?: string
}

export interface CommunityScore {
  athlete: string
  benchmark: string
  value: number
}

interface LeaderboardState {
  prs: PrEntry[]
  community: CommunityScore[]
  hydrate: () => Promise<void>
  addPr: (e: Omit<PrEntry, 'id'>) => Promise<PrEntry>
  removePr: (id: string) => Promise<void>
  prsFor: (benchmark: string) => PrEntry[]
  bestFor: (benchmark: string) => PrEntry | null
}

/** Lower-is-better for time, higher-is-better otherwise. */
export function isBetter(type: ScoreType, a: number, b: number) {
  return type === 'time' ? a < b : a > b
}

export const useLeaderboard = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      prs: [],
      community: [],
      hydrate: async () => {
        try {
          const [prsRes, ...boardRes] = await Promise.all([
            api.get('/leaderboard/prs'),
            ...BENCHMARKS.map((b) => api.get('/leaderboard/board', { params: { benchmark: b.key } })),
          ])
          const server: PrEntry[] = Array.isArray(prsRes.data) ? prsRes.data.map((r: any) => ({
            id: `srv-${r.id}`,
            serverId: r.id,
            benchmark: r.benchmark,
            value: Number(r.value),
            date: String(r.date).slice(0, 10),
            note: r.note ?? undefined,
          })) : []
          const community: CommunityScore[] = boardRes.flatMap((res, idx) => {
            const benchmark = BENCHMARKS[idx].key
            return Array.isArray(res.data)
              ? res.data.map((row: any) => ({
                  athlete: row.athlete,
                  benchmark,
                  value: Number(row.value),
                }))
              : []
          })
          set({ prs: server, community })
        } catch {
          set({ prs: [], community: [] })
        }
      },
      addPr: async (e) => {
        const res = await api.post('/leaderboard/prs', { benchmark: e.benchmark, value: e.value, date: e.date, note: e.note })
        const serverId = Number(res.data?.id)
        if (!Number.isFinite(serverId)) throw new Error('Serveri nuk ktheu ID për rekordin.')
        const row: PrEntry = { ...e, id: `srv-${serverId}`, serverId }
        set((s) => ({ prs: [row, ...s.prs] }))
        await get().hydrate()
        return row
      },
      removePr: async (id) => {
        const target = get().prs.find((p) => p.id === id)
        if (!target?.serverId) throw new Error('Rekordi nuk është i sinkronizuar me server.')
        await api.delete(`/leaderboard/prs/${target.serverId}`)
        set((s) => ({ prs: s.prs.filter((p) => p.id !== id) }))
        await get().hydrate()
      },
      prsFor: (benchmark) =>
        get()
          .prs.filter((p) => p.benchmark === benchmark)
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
      bestFor: (benchmark) => {
        const bm = benchmarkByKey(benchmark)
        if (!bm) return null
        const mine = get().prs.filter((p) => p.benchmark === benchmark)
        if (mine.length === 0) return null
        return mine.reduce((best, p) => (isBetter(bm.type, p.value, best.value) ? p : best))
      },
    }),
    {
      name: 'sucf-leaderboard-v2',
      partialize: (s) => ({ prs: s.prs, community: s.community }),
    }
  )
)

/** Format a stored value for display based on score type. */
export function formatScore(type: ScoreType, value: number): string {
  if (type === 'time') {
    const m = Math.floor(value / 60)
    const s = value % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  if (type === 'load') return `${value} kg`
  return `${value} reps`
}

/** Parse a user input into a stored numeric value. Time accepts "mm:ss" or seconds. */
export function parseScore(type: ScoreType, raw: string): number | null {
  const v = raw.trim()
  if (!v) return null
  if (type === 'time') {
    if (v.includes(':')) {
      const [m, s] = v.split(':')
      const mm = Number(m)
      const ss = Number(s)
      if (Number.isNaN(mm) || Number.isNaN(ss)) return null
      return mm * 60 + ss
    }
    const n = Number(v)
    return Number.isNaN(n) ? null : Math.round(n)
  }
  const n = Number(v)
  return Number.isNaN(n) || n < 0 ? null : n
}

/** Build a sorted leaderboard for one benchmark, including the current user's best. */
export function buildBoard(
  benchmark: string,
  community: CommunityScore[],
  myBest: number | null,
  myName = 'Ti'
): { athlete: string; value: number; isMe: boolean }[] {
  const bm = benchmarkByKey(benchmark)
  if (!bm) return []
  const rows = community
    .filter((c) => c.benchmark === benchmark)
    .map((c) => ({ athlete: c.athlete, value: c.value, isMe: false }))
  if (myBest != null) rows.push({ athlete: myName, value: myBest, isMe: true })
  return rows.sort((a, b) => (isBetter(bm.type, a.value, b.value) ? -1 : 1))
}

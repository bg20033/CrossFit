import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'

/**
 * PR tracker i ngritjeve (peshë × përsëritje). Benchmark WOD-et u hoqën —
 * mbeten vetëm ushtrimet bazë. Çdo rezultat mban peshën (kg), reps dhe
 * kohën kur u regjistrua (CreatedAt nga serveri).
 */

export interface Exercise {
  key: string
  name: string
  /** true = ushtrim me peshë trupore — pesha shtesë opsionale (0 = trup i lirë). */
  bodyweight: boolean
}

export const EXERCISES: Exercise[] = [
  { key: 'back-squat', name: 'Back Squat', bodyweight: false },
  { key: 'front-squat', name: 'Front Squat', bodyweight: false },
  { key: 'deadlift', name: 'Deadlift', bodyweight: false },
  { key: 'bench-press', name: 'Bench Press', bodyweight: false },
  { key: 'overhead-press', name: 'Overhead Press', bodyweight: false },
  { key: 'clean-and-jerk', name: 'Clean & Jerk', bodyweight: false },
  { key: 'clean', name: 'Clean', bodyweight: false },
  { key: 'snatch', name: 'Snatch', bodyweight: false },
  { key: 'pull-ups', name: 'Pull Ups', bodyweight: true },
  { key: 'chin-ups', name: 'Chin Ups', bodyweight: true },
  { key: 'dips', name: 'Dips', bodyweight: true },
  { key: 'push-ups', name: 'Push Ups', bodyweight: true },
]

export const exerciseByKey = (key: string) => EXERCISES.find((e) => e.key === key)

// Çelësat e vjetër të ruajtur në server → çelësat e rinj (të dhënat s'humbin).
const LEGACY_KEYS: Record<string, string> = {
  backsquat: 'back-squat',
  press: 'overhead-press',
}
const normalizeKey = (key: string) => LEGACY_KEYS[key] ?? key

export interface PrEntry {
  id: string
  serverId?: number
  exercise: string // exercise key
  weightKg: number // 0 = trup i lirë
  reps: number
  date: string // yyyy-mm-dd — dita kur u krye
  createdAt?: string // ISO — koha kur u regjistrua në sistem
  note?: string
}

interface LeaderboardState {
  prs: PrEntry[]
  hydrate: () => Promise<void>
  addPr: (e: Omit<PrEntry, 'id'>) => Promise<PrEntry>
  removePr: (id: string) => Promise<void>
  prsFor: (exercise: string) => PrEntry[]
  bestFor: (exercise: string) => PrEntry | null
}

/** Më i mirë = peshë më e madhe; barazim → më shumë reps. */
export function isBetter(a: PrEntry, b: PrEntry) {
  return a.weightKg !== b.weightKg ? a.weightKg > b.weightKg : a.reps > b.reps
}

export const useLeaderboard = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      prs: [],
      // Faqja është personale: vetëm rezultatet e userit aktual.
      hydrate: async () => {
        try {
          const prsRes = await api.get('/leaderboard/prs')
          const server: PrEntry[] = Array.isArray(prsRes.data) ? prsRes.data.map((r: any) => ({
            id: `srv-${r.id}`,
            serverId: r.id,
            exercise: normalizeKey(String(r.benchmark)),
            weightKg: Number(r.value),
            reps: Number(r.reps ?? 1),
            date: String(r.date).slice(0, 10),
            createdAt: r.createdAt ? String(r.createdAt) : undefined,
            note: r.note ?? undefined,
          })) : []
          set({ prs: server })
        } catch {
          set({ prs: [] })
        }
      },
      addPr: async (e) => {
        const res = await api.post('/leaderboard/prs', {
          benchmark: e.exercise,
          value: e.weightKg,
          reps: e.reps,
          date: e.date,
          note: e.note,
        })
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
      prsFor: (exercise) =>
        get()
          .prs.filter((p) => p.exercise === exercise)
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
      bestFor: (exercise) => {
        const mine = get().prs.filter((p) => p.exercise === exercise)
        if (mine.length === 0) return null
        return mine.reduce((best, p) => (isBetter(p, best) ? p : best))
      },
    }),
    {
      name: 'sucf-leaderboard-v3',
      partialize: (s) => ({ prs: s.prs }),
    }
  )
)

/** "100 kg × 5" për ngritjet, "12 reps" (ose "+10 kg × 8") për peshën trupore. */
export function formatScore(p: Pick<PrEntry, 'weightKg' | 'reps'>, bodyweight: boolean): string {
  if (bodyweight) {
    return p.weightKg > 0 ? `+${p.weightKg} kg × ${p.reps}` : `${p.reps} reps`
  }
  return `${p.weightKg} kg × ${p.reps}`
}

/** Koha e regjistrimit për shfaqje — "02.07.2026, 14:35". */
export function registeredAtLabel(createdAt?: string): string {
  if (!createdAt) return ''
  const d = new Date(createdAt.endsWith('Z') || createdAt.includes('+') ? createdAt : `${createdAt}Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

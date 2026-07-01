import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'

/**
 * Weekly class schedule with drag-drop rescheduling, persisted to the backend
 * (`/schedule`). Local persistence only caches the latest server copy.
 */

export const DAYS = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
// Class start slots (minutes from midnight).
export const TIME_SLOTS = [6 * 60, 8 * 60, 10 * 60, 17 * 60, 18 * 60, 19 * 60, 20 * 60]

export interface Session {
  id: string
  serverId?: number
  title: string
  trainer: string
  day: number // 0..6 (Mon..Sun)
  startMin: number
  durationMin: number
  room: string
  capacity: number
}

export function fmtTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface ScheduleState {
  sessions: Session[]
  hydrate: () => Promise<void>
  moveSession: (id: string, day: number, startMin: number) => Promise<void>
  addSession: (s: Omit<Session, 'id'>) => Promise<void>
  removeSession: (id: string) => Promise<void>
}

function toBody(s: Omit<Session, 'id' | 'serverId'> | Session) {
  return { title: s.title, trainer: s.trainer, day: s.day, startMin: s.startMin, durationMin: s.durationMin, room: s.room, capacity: s.capacity }
}

function fromServer(x: any): Session {
  return {
    id: `srv-${x.id}`,
    serverId: x.id,
    title: x.title,
    trainer: x.trainer,
    day: x.day,
    startMin: x.startMin,
    durationMin: x.durationMin,
    room: x.room,
    capacity: x.capacity,
  }
}

export const useSchedule = create<ScheduleState>()(
  persist(
    (set, get) => ({
      sessions: [],
      hydrate: async () => {
        try {
          const res = await api.get('/schedule')
          set({ sessions: Array.isArray(res.data) ? res.data.map(fromServer) : [] })
        } catch {
          set({ sessions: [] })
        }
      },
      moveSession: async (id, day, startMin) => {
        const target = get().sessions.find((x) => x.id === id)
        if (!target?.serverId) throw new Error('Seanca nuk është e sinkronizuar me server.')
        const moved = { ...target, day, startMin }
        await api.put(`/schedule/${target.serverId}`, toBody(moved))
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? moved : x)) }))
      },
      addSession: async (sess) => {
        const res = await api.post('/schedule', toBody(sess))
        const serverId = Number(res.data?.id)
        if (!Number.isFinite(serverId)) {
          throw new Error('Serveri nuk ktheu ID për seancën.')
        }
        set((s) => ({ sessions: [...s.sessions, { ...sess, id: `srv-${serverId}`, serverId }] }))
      },
      removeSession: async (id) => {
        const target = get().sessions.find((x) => x.id === id)
        if (!target?.serverId) throw new Error('Seanca nuk është e sinkronizuar me server.')
        await api.delete(`/schedule/${target.serverId}`)
        set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }))
      },
    }),
    {
      name: 'sucf-schedule-v2',
      partialize: (s) => ({ sessions: s.sessions }),
    }
  )
)

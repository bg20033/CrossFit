import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'

/**
 * Progress photos (before/after), persisted to the backend (`/progressphotos`)
 * Server-first: the UI only keeps photos that the API confirms.
 */

export type PhotoPose = 'front' | 'side' | 'back'

export const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Përpara',
  side: 'Anash',
  back: 'Mbrapa',
}

export interface ProgressPhoto {
  id: string
  serverId?: number
  clientId: number
  date: string // ISO yyyy-mm-dd
  pose: PhotoPose
  dataUrl: string
  weight?: number | null
}

interface PhotoState {
  photos: ProgressPhoto[]
  hydrate: (clientId: number) => Promise<void>
  addPhoto: (p: Omit<ProgressPhoto, 'id'>) => Promise<void>
  removePhoto: (id: string) => Promise<void>
  photosFor: (clientId: number) => ProgressPhoto[]
}

const mapServerPhoto = (r: any): ProgressPhoto => ({
  id: `srv-${r.id}`,
  serverId: r.id,
  clientId: r.clientId,
  date: String(r.date).slice(0, 10),
  pose: r.pose,
  dataUrl: r.dataUrl,
  weight: r.weight ?? null,
})

export const useProgressPhotos = create<PhotoState>()(
  persist(
    (set, get) => ({
      photos: [],
      hydrate: async (clientId) => {
        try {
          const res = await api.get(`/progressphotos?clientId=${clientId}`)
          const server: ProgressPhoto[] = Array.isArray(res.data) ? res.data.map(mapServerPhoto) : []
          set((s) => ({ photos: [...server, ...s.photos.filter((p) => p.clientId !== clientId)] }))
        } catch {
          set((s) => ({ photos: s.photos.filter((p) => p.clientId !== clientId) }))
        }
      },
      addPhoto: async (p) => {
        const res = await api.post('/progressphotos', {
          clientId: p.clientId, date: p.date, pose: p.pose, dataUrl: p.dataUrl, weight: p.weight ?? null,
        })
        const serverId = res.data?.id
        if (!serverId) throw new Error('missing-photo-id')
        set((s) => ({
          photos: [{ ...p, id: `srv-${serverId}`, serverId }, ...s.photos.filter((x) => x.id !== `srv-${serverId}`)],
        }))
      },
      removePhoto: async (id) => {
        const target = get().photos.find((p) => p.id === id)
        if (!target?.serverId) throw new Error('missing-photo-id')
        await api.delete(`/progressphotos/${target.serverId}`)
        set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }))
      },
      photosFor: (clientId) =>
        get()
          .photos.filter((p) => p.clientId === clientId)
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
    }),
    { name: 'sucf-progress-photos-v2' }
  )
)

/** Read an image File, resize it to fit `max` px on the long edge, return a JPEG data URL. */
export function fileToResizedDataUrl(file: File, max = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode-failed'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no-canvas'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

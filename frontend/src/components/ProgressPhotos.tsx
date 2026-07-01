import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageOff, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Panel, EmptyState } from './DashboardKit'
import {
  useProgressPhotos,
  fileToResizedDataUrl,
  POSE_LABELS,
  type PhotoPose,
  type ProgressPhoto,
} from '../features/progress/photoStore'
import { shortDate } from '../utils/format'

function BeforeAfter({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const [pos, setPos] = useState(50)
  return (
    <div>
      <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <img src={before.dataUrl} alt="Para" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img src={after.dataUrl} alt="Pas" className="h-full w-full object-cover" style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none' }} />
        </div>
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">PAS · {shortDate(after.date)}</span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">PARA · {shortDate(before.date)}</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="mt-3 w-full accent-coral-500" />
      <p className="mt-1 text-center text-xs text-gray-400">Rrëshqit për të krahasuar para / pas</p>
    </div>
  )
}

export default function ProgressPhotos({
  clientId,
  editable = true,
  title = 'Fotot e progresit',
}: {
  clientId: number
  editable?: boolean
  title?: string
}) {
  const { photosFor, addPhoto, removePhoto, hydrate } = useProgressPhotos()
  const photos = photosFor(clientId)

  useEffect(() => {
    hydrate(clientId)
  }, [clientId, hydrate])
  const inputRef = useRef<HTMLInputElement>(null)
  const [pose, setPose] = useState<PhotoPose>('front')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Default compare: oldest vs newest of the selected pose (fallback to any).
  const compare = useMemo(() => {
    const pool = photos.filter((p) => p.pose === pose)
    const list = pool.length >= 2 ? pool : photos
    if (list.length < 2) return null
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1))
    return { before: sorted[0], after: sorted[sorted.length - 1] }
  }, [photos, pose])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Zgjidh një imazh.')
      return
    }
    try {
      setBusy(true)
      setError('')
      const dataUrl = await fileToResizedDataUrl(file)
      await addPhoto({ clientId, date: new Date().toISOString().slice(0, 10), pose, dataUrl })
    } catch {
      setError('Ngarkimi i fotos dështoi.')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async (id: string) => {
    try {
      setError('')
      await removePhoto(id)
    } catch {
      setError('Fshirja e fotos dështoi.')
    }
  }

  return (
    <Panel
      title={title}
      action={
        editable ? (
          <div className="flex items-center gap-2">
            <select
              value={pose}
              onChange={(e) => setPose(e.target.value as PhotoPose)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
            >
              {(Object.keys(POSE_LABELS) as PhotoPose[]).map((p) => (
                <option key={p} value={p}>{POSE_LABELS[p]}</option>
              ))}
            </select>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
            <Button size="sm" className="bg-coral-500 text-white hover:bg-coral-600" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Camera className="mr-1 h-4 w-4" /> {busy ? 'Duke ngarkuar…' : 'Shto foto'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {error && <p className="mb-3 text-sm text-coral-600">{error}</p>}

      {photos.length === 0 ? (
        <EmptyState icon={<ImageOff className="h-5 w-5" />} text={editable ? "Ende s'ka foto. Shto foton e parë për të ndjekur ndryshimin." : 'Klienti s\'ka ngarkuar ende foto.'} />
      ) : (
        <div className="space-y-5">
          {compare && <BeforeAfter before={compare.before} after={compare.after} />}

          <div>
            <p className="label-mono mb-2">Të gjitha fotot ({photos.length})</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img src={p.dataUrl} alt={POSE_LABELS[p.pose]} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {POSE_LABELS[p.pose]} · {shortDate(p.date)}
                  </span>
                  {editable && (
                    <button
                      onClick={() => onRemove(p.id)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-500 opacity-0 transition hover:text-coral-600 group-hover:opacity-100"
                      aria-label="Fshij"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

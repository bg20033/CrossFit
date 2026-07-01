import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Button } from '../../components/ui/button'
import { extractQrToken } from './qrPayload'

/**
 * In-browser QR scanner: getUserMedia → canvas → jsQR decode loop.
 * Falls back to manual token entry when no camera / permission is denied.
 */
export function Scanner({ onResult }: { onResult: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const streamRef = useRef<MediaStream | null>(null)
  const lastRef = useRef<{ token: string; ts: number }>({ token: '', ts: 0 })

  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setActive(false)
  }

  const emit = (token: string) => {
    const t = extractQrToken(token)
    if (!t) return
    const last = lastRef.current
    const now = Date.now()
    // De-dupe rapid repeat reads of the same code.
    if (t === last.token && now - last.ts < 2500) return
    lastRef.current = { token: t, ts: now }
    onResult(t)
  }

  const tick = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) emit(code.data)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setError('Kamera nuk u hap. Lejo qasjen ose përdor futjen manuale më poshtë.')
      setActive(false)
    }
  }

  useEffect(() => () => stop(), [])

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Reticle */}
        {active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/5 w-3/5 rounded-2xl border-2 border-gray-200" />
          </div>
        )}

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-sm text-white/70">Lidh kamerën për të skanuar QR-në e anëtarëve.</p>
            <Button onClick={start} className="bg-coral-500 text-white hover:bg-coral-600">Hap kamerën</Button>
          </div>
        )}
      </div>

      {active && (
        <button onClick={stop} className="mt-2 w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800">
          Ndalo kamerën
        </button>
      )}

      {error && <p className="mt-2 rounded-lg bg-coral-50 px-3 py-2 text-xs text-coral-700">{error}</p>}

      {/* Manual fallback */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          emit(manual)
          setManual('')
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Fut tokenin ose URL-në e kartelës QR"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
        <Button type="submit" variant="outline" size="sm">Kontrollo</Button>
      </form>
    </div>
  )
}

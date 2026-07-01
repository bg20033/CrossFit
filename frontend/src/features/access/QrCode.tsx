import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { buildQrPayload } from './qrPayload'

/** Renders an opaque member token as a scannable QR (ink on white). */
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(buildQrPayload(value), {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#16130F', light: '#FFFFFF' },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [value, size])

  if (!src) {
    return <div className="animate-pulse rounded-lg bg-gray-100" style={{ width: size, height: size }} />
  }
  return <img src={src} width={size} height={size} alt={`QR ${value}`} className="rounded-lg" />
}

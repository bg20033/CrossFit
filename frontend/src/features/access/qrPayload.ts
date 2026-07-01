const QR_TOKEN_RE = /SUCF-[A-Z0-9-]{8,}/i

export function buildQrPayload(token: string) {
  return `standupcrossfit://access?token=${encodeURIComponent(token.trim().toUpperCase())}`
}

export function extractQrToken(input: string) {
  const raw = input.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const token = url.searchParams.get('token') || url.searchParams.get('qr') || url.searchParams.get('code')
    if (token) return token.trim().toUpperCase()
    const pathMatch = url.pathname.match(QR_TOKEN_RE)
    if (pathMatch) return pathMatch[0].toUpperCase()
  } catch {
    // Plain QR tokens are expected too.
  }

  const match = raw.match(QR_TOKEN_RE)
  return (match?.[0] ?? raw).trim().toUpperCase()
}

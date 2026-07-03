// QR access-decision engine (README → "QR Access Control").
// Pure logic: payment + group + time window + capacity → ACCESS GRANTED / DENIED.
// In production this runs server-side; the camera/scanner is only the input.

// Session model: split 10' entry → 10' changing → 60' training → 10' exit.
// (README labels this "1h20" but the explicit split sums to 90' — the split wins.)
export const SESSION = { entry: 10, change: 10, train: 60, exit: 10 } as const
export const SESSION_MIN = SESSION.entry + SESSION.change + SESSION.train + SESSION.exit // 90

// Check-in window: from 10' before start through entry+changing buffer after start.
export const EARLY_CHECKIN_MIN = 10
export const LATE_CHECKIN_MIN = SESSION.entry + SESSION.change // 20

export const DEFAULT_CAPACITY = 12

export interface AccessGroup {
  id: string
  name: string
  /** Minutes from midnight when the session starts. */
  startMin: number
  capacity: number
}

export interface AccessMember {
  token: string
  name: string
  groupId: string | null
  packageActive: boolean
  packageExpiry?: string // ISO date
  packageLabel?: string
}

export type Decision = 'granted' | 'denied' | 'exit'

export interface AccessContext {
  group: AccessGroup | null
  nowMin: number
  inGymCount: number
  capacity: number
  alreadyInside: boolean
}

export interface AccessVerdict {
  decision: Decision
  reason: string
  // 'trainer-checkin' = a trainer QR scan auto-opened their group session(s) —
  // not a member entry/exit/denial (AccessController.ScanTrainerAsync).
  action: 'entry' | 'exit' | 'deny' | 'trainer-checkin'
}

export function minutesNow(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function withinCheckinWindow(group: AccessGroup, nowMin: number): boolean {
  return nowMin >= group.startMin - EARLY_CHECKIN_MIN && nowMin <= group.startMin + LATE_CHECKIN_MIN
}

/** Minutes remaining until the member's session fully ends (entry → exit). */
export function remainingMin(group: AccessGroup, nowMin: number): number {
  return Math.max(0, group.startMin + SESSION_MIN - nowMin)
}

export function decideAccess(member: AccessMember | null, ctx: AccessContext): AccessVerdict {
  // An already-inside member scanning again = checkout.
  if (member && ctx.alreadyInside) {
    return { decision: 'exit', reason: 'Dalje e regjistruar', action: 'exit' }
  }
  if (!member) {
    return { decision: 'denied', reason: 'Anëtar i panjohur', action: 'deny' }
  }
  if (!member.packageActive) {
    return { decision: 'denied', reason: 'Pakoja ka skaduar ose pa pagesë', action: 'deny' }
  }
  if (!ctx.group || member.groupId !== ctx.group.id) {
    return { decision: 'denied', reason: 'Nuk ke grup të caktuar në këtë orar', action: 'deny' }
  }
  if (!withinCheckinWindow(ctx.group, ctx.nowMin)) {
    return { decision: 'denied', reason: 'Jashtë orarit të grupit', action: 'deny' }
  }
  if (ctx.inGymCount >= ctx.capacity) {
    return { decision: 'denied', reason: 'Salla është në kapacitet', action: 'deny' }
  }
  return { decision: 'granted', reason: 'Qasje e lejuar — mirë se vjen', action: 'entry' }
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

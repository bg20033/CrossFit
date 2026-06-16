import { UserRole } from '../types'

// Backend serializes roles in PascalCase ("Admin", "GymOwner"); the frontend
// uses snake/lower form ("admin", "gym_owner"). Normalize so role checks work.
export function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'client'
  const snake = role
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
  return snake as UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  gym_owner: 'Pronar i Palestrës',
  trainer: 'Trajner',
  staff: 'Recepsion',
  client: 'Klient',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

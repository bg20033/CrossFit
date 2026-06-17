import { UserRole } from '../types'

export const ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  CLIENT: 'client',
  GYM_OWNER: 'gym_owner',
  STAFF: 'staff',
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  trainer: 'Trajner',
  client: 'Klient',
  gym_owner: 'Pronar i Sallës',
  staff: 'Stafi',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

export function hasRole(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

export const ADMIN_ROLES: UserRole[] = ['admin', 'gym_owner']
export const TRAINER_ROLES: UserRole[] = ['trainer']
export const CLIENT_ROLES: UserRole[] = ['client']
export const STAFF_ROLES: UserRole[] = ['staff']

export function isAdmin(role: UserRole | undefined): boolean {
  return hasRole(role, ADMIN_ROLES)
}

export function isTrainer(role: UserRole | undefined): boolean {
  return hasRole(role, TRAINER_ROLES)
}

export function isClient(role: UserRole | undefined): boolean {
  return hasRole(role, CLIENT_ROLES)
}

export function normalizeRole(role: string): UserRole {
  const normalized = role.replace('_', '').toLowerCase()
  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('owner') || normalized.includes('gym')) return 'gym_owner'
  if (normalized.includes('trainer')) return 'trainer'
  if (normalized.includes('client')) return 'client'
  if (normalized.includes('staff')) return 'staff'
  return 'client'
}

import { UserRole } from '../types'

export const ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  CLIENT: 'client',
  GYM_OWNER: 'gym_owner',
  STAFF: 'staff',
  CASHIER: 'cashier',
  TRAINER_TENANT: 'trainer_tenant',
  TENANT_CLIENT: 'tenant_client',
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  trainer: 'Trajner',
  client: 'Klient',
  gym_owner: 'Pronar i Sallës',
  staff: 'Stafi',
  cashier: 'Arka',
  trainer_tenant: 'Qiragji',
  tenant_client: 'Klient (Qira)',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

export function hasRole(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

// Role groups (the server must enforce the same boundaries — see README → Data Isolation).
export const ADMIN_ROLES: UserRole[] = ['admin', 'gym_owner']
export const TRAINER_ROLES: UserRole[] = ['trainer']
export const CLIENT_ROLES: UserRole[] = ['client']
export const STAFF_ROLES: UserRole[] = ['staff']
/** Front-desk roles that operate the cash register + QR access (Arka). */
export const DESK_ROLES: UserRole[] = ['cashier', 'staff', 'admin', 'gym_owner']
export const TENANT_ROLES: UserRole[] = ['trainer_tenant']
export const TENANT_CLIENT_ROLES: UserRole[] = ['tenant_client']

export function isAdmin(role: UserRole | undefined): boolean {
  return hasRole(role, ADMIN_ROLES)
}

export function isTrainer(role: UserRole | undefined): boolean {
  return hasRole(role, TRAINER_ROLES)
}

export function isClient(role: UserRole | undefined): boolean {
  return hasRole(role, CLIENT_ROLES)
}

export function isDesk(role: UserRole | undefined): boolean {
  return hasRole(role, DESK_ROLES)
}

export function isTenant(role: UserRole | undefined): boolean {
  return hasRole(role, TENANT_ROLES)
}

export function normalizeRole(role: string): UserRole {
  const normalized = role.replace(/[_\s-]/g, '').toLowerCase()
  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('owner')) return 'gym_owner'
  // Tenant variants must be checked before the generic trainer/client matches.
  if (normalized.includes('trainertenant') || normalized.includes('tenanttrainer')) return 'trainer_tenant'
  if (normalized.includes('tenantclient') || normalized.includes('clienttenant')) return 'tenant_client'
  if (normalized.includes('cashier') || normalized.includes('arka')) return 'cashier'
  if (normalized.includes('trainer')) return 'trainer'
  if (normalized.includes('client')) return 'client'
  if (normalized.includes('staff') || normalized.includes('recep')) return 'staff'
  if (normalized.includes('tenant')) return 'trainer_tenant'
  return 'client'
}

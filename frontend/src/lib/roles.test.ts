import { describe, it, expect } from 'vitest'
import { normalizeRole, roleLabel, hasRole, isAdmin, isTrainer, isClient } from './roles'

describe('normalizeRole', () => {
  it('maps backend PascalCase to canonical frontend roles', () => {
    expect(normalizeRole('Admin')).toBe('admin')
    expect(normalizeRole('GymOwner')).toBe('gym_owner')
    expect(normalizeRole('gym_owner')).toBe('gym_owner')
    expect(normalizeRole('Trainer')).toBe('trainer')
    expect(normalizeRole('Client')).toBe('client')
    expect(normalizeRole('Staff')).toBe('staff')
  })
})

describe('roleLabel', () => {
  it('returns Albanian labels', () => {
    expect(roleLabel('admin')).toBe('Admin')
    expect(roleLabel('gym_owner')).toBe('Pronar i Sallës')
    expect(roleLabel('trainer')).toBe('Trajner')
  })
})

describe('role guards', () => {
  it('hasRole respects the allow-list and undefined', () => {
    expect(hasRole('admin', ['admin', 'gym_owner'])).toBe(true)
    expect(hasRole('client', ['admin', 'gym_owner'])).toBe(false)
    expect(hasRole(undefined, ['admin'])).toBe(false)
  })
  it('isAdmin / isTrainer / isClient', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('gym_owner')).toBe(true)
    expect(isAdmin('client')).toBe(false)
    expect(isTrainer('trainer')).toBe(true)
    expect(isClient('client')).toBe(true)
    expect(isClient('admin')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  decideAccess,
  withinCheckinWindow,
  remainingMin,
  type AccessGroup,
  type AccessMember,
  type AccessContext,
} from './accessEngine'

const group: AccessGroup = { id: 'g1', name: '18:00', startMin: 18 * 60, capacity: 12 }
const member: AccessMember = { token: 'tok', name: 'Arian', groupId: 'g1', packageActive: true }

const ctx = (over: Partial<AccessContext> = {}): AccessContext => ({
  group,
  nowMin: 18 * 60, // exactly at start
  inGymCount: 3,
  capacity: 12,
  alreadyInside: false,
  ...over,
})

describe('check-in window', () => {
  it('opens 10 min early and closes 20 min after start', () => {
    expect(withinCheckinWindow(group, 18 * 60 - 10)).toBe(true)
    expect(withinCheckinWindow(group, 18 * 60 + 20)).toBe(true)
    expect(withinCheckinWindow(group, 18 * 60 - 11)).toBe(false)
    expect(withinCheckinWindow(group, 18 * 60 + 21)).toBe(false)
  })
})

describe('decideAccess', () => {
  it('grants a paid member in their window with capacity', () => {
    expect(decideAccess(member, ctx()).decision).toBe('granted')
  })
  it('denies an unknown token', () => {
    expect(decideAccess(null, ctx()).decision).toBe('denied')
  })
  it('denies expired/unpaid package', () => {
    const v = decideAccess({ ...member, packageActive: false }, ctx())
    expect(v.decision).toBe('denied')
    expect(v.reason).toMatch(/Pakoja/)
  })
  it('denies outside the time window', () => {
    expect(decideAccess(member, ctx({ nowMin: 9 * 60 })).decision).toBe('denied')
  })
  it('denies wrong group', () => {
    expect(decideAccess({ ...member, groupId: 'other' }, ctx()).decision).toBe('denied')
  })
  it('denies when at capacity', () => {
    const v = decideAccess(member, ctx({ inGymCount: 12 }))
    expect(v.decision).toBe('denied')
    expect(v.reason).toMatch(/kapacitet/)
  })
  it('logs an exit when the member is already inside', () => {
    expect(decideAccess(member, ctx({ alreadyInside: true })).action).toBe('exit')
  })
})

describe('remainingMin', () => {
  it('counts down to session end (90 min split)', () => {
    expect(remainingMin(group, 18 * 60)).toBe(90)
    expect(remainingMin(group, 18 * 60 + 90)).toBe(0)
    expect(remainingMin(group, 18 * 60 + 200)).toBe(0)
  })
})

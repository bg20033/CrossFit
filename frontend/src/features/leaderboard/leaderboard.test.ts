import { describe, it, expect } from 'vitest'
import { EXERCISES, exerciseByKey, formatScore, isBetter, registeredAtLabel, type PrEntry } from './leaderboardStore'

const pr = (weightKg: number, reps: number): PrEntry => ({
  id: 'x',
  exercise: 'back-squat',
  weightKg,
  reps,
  date: '2026-07-02',
})

describe('EXERCISES', () => {
  it('contains the 12 base lifts with unique keys', () => {
    expect(EXERCISES).toHaveLength(12)
    expect(new Set(EXERCISES.map((e) => e.key)).size).toBe(12)
    expect(exerciseByKey('back-squat')?.name).toBe('Back Squat')
    expect(exerciseByKey('clean-and-jerk')?.bodyweight).toBe(false)
    expect(exerciseByKey('pull-ups')?.bodyweight).toBe(true)
  })
})

describe('isBetter', () => {
  it('heavier weight wins', () => {
    expect(isBetter(pr(110, 1), pr(100, 10))).toBe(true)
    expect(isBetter(pr(90, 10), pr(100, 1))).toBe(false)
  })
  it('equal weight → more reps wins', () => {
    expect(isBetter(pr(100, 6), pr(100, 5))).toBe(true)
    expect(isBetter(pr(0, 15), pr(0, 12))).toBe(true)
  })
})

describe('formatScore', () => {
  it('formats barbell lifts as kg × reps', () => {
    expect(formatScore(pr(100, 5), false)).toBe('100 kg × 5')
  })
  it('formats bodyweight as reps, with +kg when weighted', () => {
    expect(formatScore(pr(0, 12), true)).toBe('12 reps')
    expect(formatScore(pr(10, 8), true)).toBe('+10 kg × 8')
  })
})

describe('registeredAtLabel', () => {
  it('is empty without a timestamp', () => {
    expect(registeredAtLabel(undefined)).toBe('')
    expect(registeredAtLabel('jo-datë')).toBe('')
  })
  it('formats an ISO timestamp', () => {
    expect(registeredAtLabel('2026-07-02T12:30:00Z')).toMatch(/2026/)
  })
})

import { describe, it, expect } from 'vitest'
import { eur, shortDate } from './format'

describe('eur', () => {
  it('formats currency with € and 2 decimals', () => {
    expect(eur(30)).toBe('€30,00')
    expect(eur(1000)).toBe('€1.000,00')
  })
  it('handles null/undefined as zero', () => {
    expect(eur(null)).toBe('€0,00')
    expect(eur(undefined)).toBe('€0,00')
  })
})

describe('shortDate', () => {
  it('returns em-dash for empty/invalid', () => {
    expect(shortDate(null)).toBe('—')
    expect(shortDate('not-a-date')).toBe('—')
  })
  it('formats a real date', () => {
    const out = shortDate('2026-06-15')
    expect(out).toContain('2026')
    expect(out).toContain('Jun')
    expect(out).toContain('15')
  })
})

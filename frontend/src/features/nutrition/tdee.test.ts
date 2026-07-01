import { describe, it, expect } from 'vitest'
import { calcTdee, bmrRaw, type TdeeInput } from './tdee'

describe('TDEE engine (README formula)', () => {
  it('male · 80kg/180cm/30y · moderate · maintain', () => {
    const input: TdeeInput = {
      gender: 'M', weightKg: 80, heightCm: 180, age: 30, activity: 'moderate', goal: 'maintain',
    }
    expect(bmrRaw(input)).toBe(1780)
    const r = calcTdee(input)
    expect(r.tdee).toBe(2759)
    expect(r.target).toBe(2759)
    expect(r.protein).toBe(160)
    expect(r.fat).toBe(77)
    expect(r.carbs).toBe(357)
  })

  it('male · lose subtracts 500', () => {
    const r = calcTdee({ gender: 'M', weightKg: 80, heightCm: 180, age: 30, activity: 'moderate', goal: 'lose' })
    expect(r.target).toBe(2259)
    expect(r.fat).toBe(63)
    expect(r.carbs).toBe(263)
  })

  it('female · 60kg/165cm/28y · light · lose', () => {
    const r = calcTdee({ gender: 'F', weightKg: 60, heightCm: 165, age: 28, activity: 'light', goal: 'lose' })
    expect(r.bmr).toBe(1330)
    expect(r.tdee).toBe(1829)
    expect(r.target).toBe(1329)
    expect(r.protein).toBe(120)
    expect(r.fat).toBe(37)
    expect(r.carbs).toBe(129)
  })

  it('gain adds 400 to TDEE', () => {
    const maintain = calcTdee({ gender: 'M', weightKg: 90, heightCm: 185, age: 25, activity: 'high', goal: 'maintain' })
    const gain = calcTdee({ gender: 'M', weightKg: 90, heightCm: 185, age: 25, activity: 'high', goal: 'gain' })
    expect(gain.target).toBe(maintain.tdee + 400)
  })

  it('carbs never go negative', () => {
    const r = calcTdee({ gender: 'F', weightKg: 120, heightCm: 150, age: 60, activity: 'sedentary', goal: 'lose' })
    expect(r.carbs).toBeGreaterThanOrEqual(0)
  })
})

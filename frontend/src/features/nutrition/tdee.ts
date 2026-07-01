// TDEE / BMR / macro engine — ported verbatim from README → "TDEE Calculator".
// Mifflin–St Jeor BMR, activity-factor TDEE, goal-adjusted daily target, macro split.

export type Gender = 'M' | 'F'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'veryHigh'
export type Goal = 'lose' | 'maintain' | 'gain'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  veryHigh: 1.9,
}

// Albanian labels for the onboarding UI.
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'I ulët (zyrë)',
  light: 'I lehtë (1–2×/javë)',
  moderate: 'Mesatar (3–4×/javë)',
  high: 'I lartë (5–6×/javë)',
  veryHigh: 'Shumë i lartë (atlet)',
}

export const ACTIVITY_ORDER: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'high', 'veryHigh']

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Humb peshë',
  maintain: 'Mbaj peshë',
  gain: 'Shto peshë',
}

export interface TdeeInput {
  gender: Gender
  weightKg: number
  heightCm: number
  age: number
  activity: ActivityLevel
  goal: Goal
}

export interface TdeeResult {
  bmr: number
  tdee: number
  /** Daily calorie target after the goal adjustment. */
  target: number
  protein: number // grams
  fat: number // grams
  carbs: number // grams
}

/** Raw Mifflin–St Jeor BMR (kept unrounded so TDEE rounds once, as in the spec). */
export function bmrRaw({ gender, weightKg, heightCm, age }: TdeeInput): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'M' ? 5 : -161)
}

export function calcTdee(input: TdeeInput): TdeeResult {
  const bmr = bmrRaw(input)
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[input.activity])

  const target =
    input.goal === 'lose' ? tdee - 500 : input.goal === 'gain' ? tdee + 400 : tdee

  const protein = Math.round(input.weightKg * 2)
  const fat = Math.round((target * 0.25) / 9)
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4))

  return { bmr: Math.round(bmr), tdee, target, protein, fat, carbs }
}

/** Macro calories, useful for ring/bar widgets. */
export function macroKcal(r: Pick<TdeeResult, 'protein' | 'fat' | 'carbs'>) {
  return { protein: r.protein * 4, carbs: r.carbs * 4, fat: r.fat * 9 }
}

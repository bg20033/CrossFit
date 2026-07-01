import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { calcTdee, type TdeeInput, type TdeeResult } from './tdee'
import api from '../../utils/api'

interface NutritionProfileState {
  input: TdeeInput | null
  result: TdeeResult | null
  hydrate: () => Promise<void>
  /** Persist the onboarding answers + computed targets to the client profile. */
  saveProfile: (input: TdeeInput) => Promise<TdeeResult>
  clear: () => void
}

export const useNutritionProfile = create<NutritionProfileState>()(
  persist(
    (set) => ({
      input: null,
      result: null,
      hydrate: async () => {
        const res = await api.get('/nutrition/me', { validateStatus: (status) => status === 200 || status === 204 })
        if (res.status === 204 || !res.data) {
          set({ input: null, result: null })
          return
        }
        const input: TdeeInput = {
          gender: res.data.gender,
          weightKg: Number(res.data.weightKg),
          heightCm: Number(res.data.heightCm),
          age: Number(res.data.age),
          activity: res.data.activity,
          goal: res.data.goal,
        }
        const result: TdeeResult = {
          bmr: Number(res.data.bmr),
          tdee: Number(res.data.tdee),
          target: Number(res.data.target),
          protein: Number(res.data.protein),
          carbs: Number(res.data.carbs),
          fat: Number(res.data.fat),
        }
        set({ input, result })
      },
      saveProfile: async (input) => {
        const res = await api.put('/nutrition/me', input)
        const result: TdeeResult = res.data
          ? {
              bmr: Number(res.data.bmr),
              tdee: Number(res.data.tdee),
              target: Number(res.data.target),
              protein: Number(res.data.protein),
              carbs: Number(res.data.carbs),
              fat: Number(res.data.fat),
            }
          : calcTdee(input)
        set({ input, result })
        return result
      },
      clear: () => set({ input: null, result: null }),
    }),
    { name: 'sucf-nutrition-profile-v2' }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Mëngjes',
  lunch: 'Drekë',
  dinner: 'Darkë',
  snack: 'Snack',
}

export interface FoodEntry {
  id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  meal: MealType
}

interface DayLog {
  foods: FoodEntry[]
  waterMl: number
}

interface FoodState {
  byDate: Record<string, DayLog>
  hydrateDay: (date: string) => Promise<void>
  addFood: (date: string, entry: Omit<FoodEntry, 'id'>) => Promise<void>
  removeFood: (date: string, id: string) => Promise<void>
  addWater: (date: string, ml: number) => Promise<void>
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const emptyDay: DayLog = { foods: [], waterMl: 0 }

export const useFoodLog = create<FoodState>()(
  persist(
    (set, get) => ({
      byDate: {},
      hydrateDay: async (date) => {
        const res = await api.get('/nutrition/log', { params: { date } })
        const foods: FoodEntry[] = Array.isArray(res.data?.foods)
          ? res.data.foods.map((f: any) => ({
              id: `srv-${f.id}`,
              name: f.name,
              kcal: Number(f.kcal) || 0,
              protein: Number(f.protein) || 0,
              carbs: Number(f.carbs) || 0,
              fat: Number(f.fat) || 0,
              meal: f.meal,
            }))
          : []
        set((s) => ({
          byDate: {
            ...s.byDate,
            [date]: { foods, waterMl: Number(res.data?.waterMl) || 0 },
          },
        }))
      },
      addFood: async (date, entry) => {
        const res = await api.post('/nutrition/log/foods', { ...entry, date })
        const serverId = Number(res.data?.id)
        if (!Number.isFinite(serverId)) throw new Error('Serveri nuk ktheu ID për ushqimin.')
        const food: FoodEntry = { ...entry, id: `srv-${serverId}` }
        set((s) => {
          const day = s.byDate[date] ?? emptyDay
          return { byDate: { ...s.byDate, [date]: { ...day, foods: [...day.foods, food] } } }
        })
      },
      removeFood: async (date, id) => {
        const serverId = id.startsWith('srv-') ? Number(id.slice(4)) : null
        if (!serverId) throw new Error('Ushqimi nuk është i sinkronizuar me server.')
        await api.delete(`/nutrition/log/foods/${serverId}`)
        set((s) => {
          const day = s.byDate[date] ?? emptyDay
          return { byDate: { ...s.byDate, [date]: { ...day, foods: day.foods.filter((f) => f.id !== id) } } }
        })
      },
      addWater: async (date, ml) => {
        const current = get().byDate[date] ?? emptyDay
        const nextMl = Math.max(0, current.waterMl + ml)
        await api.put('/nutrition/log/water', { date, waterMl: nextMl })
        set((s) => {
          const day = s.byDate[date] ?? emptyDay
          return { byDate: { ...s.byDate, [date]: { ...day, waterMl: nextMl } } }
        })
      },
    }),
    { name: 'sucf-food-log-v2' }
  )
)

export function dayTotals(foods: FoodEntry[]) {
  return foods.reduce(
    (acc, f) => ({
      kcal: acc.kcal + f.kcal,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export type FoodItem = Omit<FoodEntry, 'id' | 'meal'>

/** A few common Kosovo/CrossFit-friendly quick foods (per portion). */
export const QUICK_FOODS: FoodItem[] = [
  { name: 'Vezë të ziera (2)', kcal: 156, protein: 13, carbs: 1, fat: 11 },
  { name: 'Gjoks pule (150g)', kcal: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'Oriz i zier (1 filxhan)', kcal: 205, protein: 4, carbs: 45, fat: 0 },
  { name: 'Banane', kcal: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Jogurt grek (170g)', kcal: 100, protein: 17, carbs: 6, fat: 1 },
  { name: 'Proteinë whey (1 scoop)', kcal: 120, protein: 24, carbs: 3, fat: 1 },
]

/** Searchable food database (per portion). Used by the calorie counter search box. */
export const FOOD_DB: FoodItem[] = [
  ...QUICK_FOODS,
  { name: 'Mish viçi i pjekur (150g)', kcal: 312, protein: 39, carbs: 0, fat: 17 },
  { name: 'Salmon i pjekur (150g)', kcal: 280, protein: 39, carbs: 0, fat: 13 },
  { name: 'Ton në ujë (1 kuti)', kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Patate të ziera (200g)', kcal: 174, protein: 4, carbs: 40, fat: 0 },
  { name: 'Bukë gruri (1 fetë)', kcal: 80, protein: 3, carbs: 14, fat: 1 },
  { name: 'Tërshërë (50g)', kcal: 190, protein: 7, carbs: 32, fat: 3 },
  { name: 'Qumësht (250ml)', kcal: 122, protein: 8, carbs: 12, fat: 5 },
  { name: 'Djathë i bardhë (50g)', kcal: 132, protein: 8, carbs: 1, fat: 11 },
  { name: 'Avokado (1/2)', kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Bajame (30g)', kcal: 173, protein: 6, carbs: 6, fat: 15 },
  { name: 'Mollë', kcal: 95, protein: 0, carbs: 25, fat: 0 },
  { name: 'Spinaq i zier (100g)', kcal: 23, protein: 3, carbs: 4, fat: 0 },
  { name: 'Brokoli i zier (100g)', kcal: 35, protein: 2, carbs: 7, fat: 0 },
  { name: 'Makarona të ziera (1 filxhan)', kcal: 220, protein: 8, carbs: 43, fat: 1 },
  { name: 'Oriz kaf (1 filxhan)', kcal: 216, protein: 5, carbs: 45, fat: 2 },
  { name: 'Fasule të ziera (1 filxhan)', kcal: 245, protein: 15, carbs: 45, fat: 1 },
  { name: 'Vaj ulliri (1 lugë)', kcal: 119, protein: 0, carbs: 0, fat: 14 },
  { name: 'Mjaltë (1 lugë)', kcal: 64, protein: 0, carbs: 17, fat: 0 },
  { name: 'Kos i thjeshtë (200g)', kcal: 122, protein: 10, carbs: 9, fat: 5 },
]

/** Case-insensitive food search across the DB. */
export function searchFoods(query: string, limit = 8): FoodItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return FOOD_DB.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit)
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../../utils/api'
import type { FoodItem } from './foodStore'

/**
 * Recipes + shopping list, persisted to the backend (`/kitchen/*`) with a
 * local cache of the latest server copy.
 */

export interface Recipe {
  id: string
  serverId?: number
  name: string
  servings: number
  items: FoodItem[] // each item is one ingredient portion
}

export interface ShoppingItem {
  id: string
  serverId?: number
  name: string
  checked: boolean
}

interface KitchenState {
  recipes: Recipe[]
  shopping: ShoppingItem[]
  hydrate: () => Promise<void>
  addRecipe: (r: Omit<Recipe, 'id'>) => Promise<void>
  removeRecipe: (id: string) => Promise<void>
  addShoppingItem: (name: string) => Promise<void>
  toggleShoppingItem: (id: string) => Promise<void>
  removeShoppingItem: (id: string) => Promise<void>
  clearChecked: () => Promise<void>
  generateFromRecipes: (recipeIds: string[]) => Promise<number>
}

/** Totals for a whole recipe (all servings combined). */
export function recipeTotals(r: Recipe) {
  return r.items.reduce(
    (a, f) => ({
      kcal: a.kcal + f.kcal,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fat: a.fat + f.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

/** Per-serving macros for a recipe. */
export function recipePerServing(r: Recipe) {
  const t = recipeTotals(r)
  const s = Math.max(1, r.servings)
  return {
    kcal: Math.round(t.kcal / s),
    protein: Math.round(t.protein / s),
    carbs: Math.round(t.carbs / s),
    fat: Math.round(t.fat / s),
  }
}

function parseItems(json: string): FoodItem[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export const useKitchen = create<KitchenState>()(
  persist(
    (set, get) => ({
      recipes: [],
      shopping: [],
      hydrate: async () => {
        try {
          const [r, s] = await Promise.all([api.get('/kitchen/recipes'), api.get('/kitchen/shopping')])
          set({
            recipes: Array.isArray(r.data)
              ? r.data.map((x: any) => ({
                  id: `srv-${x.id}`, serverId: x.id, name: x.name, servings: x.servings, items: parseItems(x.itemsJson),
                }))
              : [],
            shopping: Array.isArray(s.data)
              ? s.data.map((x: any) => ({ id: `srv-${x.id}`, serverId: x.id, name: x.name, checked: x.checked }))
              : [],
          })
        } catch {
          set({ recipes: [], shopping: [] })
        }
      },
      addRecipe: async (r) => {
        const res = await api.post('/kitchen/recipes', { name: r.name, servings: r.servings, itemsJson: JSON.stringify(r.items) })
        const serverId = Number(res.data?.id)
        if (!Number.isFinite(serverId)) {
          throw new Error('Serveri nuk ktheu ID për recetën.')
        }
        set((s) => ({ recipes: [{ ...r, id: `srv-${serverId}`, serverId }, ...s.recipes] }))
      },
      removeRecipe: async (id) => {
        const t = get().recipes.find((r) => r.id === id)
        if (!t?.serverId) throw new Error('Receta nuk është e sinkronizuar me server.')
        await api.delete(`/kitchen/recipes/${t.serverId}`)
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }))
      },
      addShoppingItem: async (name) => {
        const clean = name.trim()
        if (!clean) return
        if (get().shopping.some((i) => i.name.toLowerCase() === clean.toLowerCase())) return
        const res = await api.post('/kitchen/shopping', { name: clean })
        const serverId = Number(res.data?.id)
        if (!Number.isFinite(serverId)) {
          throw new Error('Serveri nuk ktheu ID për artikullin.')
        }
        set((s) => ({ shopping: [...s.shopping, { id: `srv-${serverId}`, serverId, name: clean, checked: false }] }))
      },
      toggleShoppingItem: async (id) => {
        const t = get().shopping.find((i) => i.id === id)
        if (!t?.serverId) throw new Error('Artikulli nuk është i sinkronizuar me server.')
        const next = !(t?.checked ?? false)
        await api.put(`/kitchen/shopping/${t.serverId}`, { checked: next })
        set((s) => ({ shopping: s.shopping.map((i) => (i.id === id ? { ...i, checked: next } : i)) }))
      },
      removeShoppingItem: async (id) => {
        const t = get().shopping.find((i) => i.id === id)
        if (!t?.serverId) throw new Error('Artikulli nuk është i sinkronizuar me server.')
        await api.delete(`/kitchen/shopping/${t.serverId}`)
        set((s) => ({ shopping: s.shopping.filter((i) => i.id !== id) }))
      },
      clearChecked: async () => {
        const checked = get().shopping.filter((i) => i.checked)
        if (checked.some((i) => !i.serverId)) throw new Error('Disa artikuj nuk janë të sinkronizuar me server.')
        await Promise.all(checked.map((i) => api.delete(`/kitchen/shopping/${i.serverId}`)))
        set((s) => ({ shopping: s.shopping.filter((i) => !i.checked) }))
      },
      generateFromRecipes: async (recipeIds) => {
        const recipes = get().recipes.filter((r) => recipeIds.includes(r.id))
        const names = new Set<string>()
        recipes.forEach((r) => r.items.forEach((it) => names.add(it.name)))
        let added = 0
        const existing = new Set(get().shopping.map((i) => i.name.toLowerCase()))
        for (const n of names) {
          if (!existing.has(n.toLowerCase())) {
            await get().addShoppingItem(n)
            added++
          }
        }
        return added
      },
    }),
    { name: 'sucf-kitchen-v2' }
  )
)

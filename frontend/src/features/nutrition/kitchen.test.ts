import { describe, it, expect } from 'vitest'
import { recipeTotals, recipePerServing, type Recipe } from './kitchenStore'

const recipe: Recipe = {
  id: 'r1',
  name: 'Chicken & Rice',
  servings: 2,
  items: [
    { name: 'Gjoks pule (150g)', kcal: 248, protein: 46, carbs: 0, fat: 5 },
    { name: 'Oriz i zier (1 filxhan)', kcal: 205, protein: 4, carbs: 45, fat: 0 },
  ],
}

describe('recipe macros', () => {
  it('sums totals across ingredients', () => {
    expect(recipeTotals(recipe)).toEqual({ kcal: 453, protein: 50, carbs: 45, fat: 5 })
  })
  it('divides per serving and rounds', () => {
    expect(recipePerServing(recipe)).toEqual({ kcal: 227, protein: 25, carbs: 23, fat: 3 })
  })
  it('never divides by zero', () => {
    const r = { ...recipe, servings: 0 }
    expect(recipePerServing(r).kcal).toBe(453)
  })
})

import { Apple, UtensilsCrossed, Search, ChefHat, ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardShell, DashboardHeader, Panel, MacroSummary, EmptyState } from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import { useNutritionProfile } from '../features/nutrition/profileStore'
import {
  useFoodLog,
  todayKey,
  dayTotals,
  MEAL_LABELS,
  QUICK_FOODS,
  searchFoods,
  type MealType,
  type FoodItem,
} from '../features/nutrition/foodStore'
import { useKitchen, recipePerServing } from '../features/nutrition/kitchenStore'

const WATER_GOAL_ML = 2500
const GLASS_ML = 250

const emptyForm = { name: '', kcal: '', protein: '', carbs: '', fat: '', meal: 'breakfast' as MealType }

export default function ClientNutrition() {
  const { result, hydrate: hydrateNutritionProfile } = useNutritionProfile()
  const { addNotification } = useNotification()
  const date = todayKey()
  const { byDate, hydrateDay, addFood, removeFood, addWater } = useFoodLog()
  const day = byDate[date] ?? { foods: [], waterMl: 0 }
  const totals = dayTotals(day.foods)
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')

  // Recipes + shopping list
  const { recipes, shopping, addRecipe, removeRecipe, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearChecked, generateFromRecipes, hydrate: hydrateKitchen } = useKitchen()

  useEffect(() => {
    hydrateNutritionProfile().catch(() => {})
  }, [hydrateNutritionProfile])

  useEffect(() => {
    hydrateDay(date).catch(() => {
      addNotification('Gabim', 'Ditari i ushqimit nuk u ngarkua nga serveri.', 'error')
    })
  }, [hydrateDay, date, addNotification])

  useEffect(() => {
    hydrateKitchen()
  }, [hydrateKitchen])
  const [recipeName, setRecipeName] = useState('')
  const [recipeServings, setRecipeServings] = useState('1')
  const [recipeItems, setRecipeItems] = useState<FoodItem[]>([])
  const [recipeQuery, setRecipeQuery] = useState('')
  const [shopInput, setShopInput] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const results = searchFoods(query)
  const recipeResults = searchFoods(recipeQuery)

  // No targets yet → push the user through onboarding first.
  if (!result) {
    return (
      <DashboardShell>
        <DashboardHeader title="Ushqimi & Kaloritë" subtitle="Numëruesi i kalorive me makro dhe ujë." />
        <Panel title="Konfiguro objektivat e tua">
          <EmptyState icon={<Apple className="h-5 w-5" />} text="Plotëso profilin tënd që të llogarisim kaloritë dhe makrot ditore." />
          <div className="mt-4 flex justify-center">
            <Link to="/onboarding">
              <Button className="bg-coral-500 text-white hover:bg-coral-600">Fillo konfigurimin →</Button>
            </Link>
          </div>
        </Panel>
      </DashboardShell>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.kcal) return
    try {
      await addFood(date, {
        name: form.name.trim(),
        kcal: Number(form.kcal) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        meal: form.meal,
      })
      setForm(emptyForm)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ushqimi nuk u ruajt në server.', 'error')
    }
  }

  const logFood = async (entry: FoodItem & { meal: MealType }) => {
    try {
      await addFood(date, entry)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ushqimi nuk u ruajt në server.', 'error')
    }
  }

  const deleteFood = async (id: string) => {
    try {
      await removeFood(date, id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ushqimi nuk u fshi nga serveri.', 'error')
    }
  }

  const changeWater = async (ml: number) => {
    try {
      await addWater(date, ml)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Uji nuk u ruajt në server.', 'error')
    }
  }

  const saveRecipe = async () => {
    try {
      await addRecipe({ name: recipeName.trim(), servings: Math.max(1, Number(recipeServings) || 1), items: recipeItems })
      setRecipeName('')
      setRecipeServings('1')
      setRecipeItems([])
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Receta nuk u ruajt në server.', 'error')
    }
  }

  const deleteRecipe = async (id: string) => {
    try {
      await removeRecipe(id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Receta nuk u fshi nga serveri.', 'error')
    }
  }

  const addShop = async (name: string) => {
    try {
      await addShoppingItem(name)
      setShopInput('')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Artikulli nuk u ruajt në server.', 'error')
    }
  }

  const toggleShop = async (id: string) => {
    try {
      await toggleShoppingItem(id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Artikulli nuk u ndryshua në server.', 'error')
    }
  }

  const deleteShop = async (id: string) => {
    try {
      await removeShoppingItem(id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Artikulli nuk u fshi nga serveri.', 'error')
    }
  }

  const clearShop = async () => {
    try {
      await clearChecked()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Lista nuk u pastrua në server.', 'error')
    }
  }

  const generateShopping = async () => {
    try {
      await generateFromRecipes(picked)
      setPicked([])
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Lista nuk u gjenerua në server.', 'error')
    }
  }

  const glasses = Math.round(day.waterMl / GLASS_ML)
  const waterPct = Math.min(100, Math.round((day.waterMl / WATER_GOAL_ML) * 100))

  const inputCls =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100'

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Sot"
        title="Ushqimi & Kaloritë"
        subtitle="Ndiq kaloritë dhe makrot kundrejt objektivave të profilit tënd."
        right={
          <Link to="/onboarding">
            <Button variant="outline" size="sm">Rillogarit objektivat</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calorie ring + macros */}
        <Panel title="Përmbledhja e sotme" className="lg:col-span-2">
          <MacroSummary
            calories={totals.kcal}
            caloriesGoal={result.target}
            items={[
              { label: 'Proteina', value: totals.protein, goal: result.protein, color: '#EE3A24' },
              { label: 'Karbohidrate', value: totals.carbs, goal: result.carbs, color: '#1F9D55' },
              { label: 'Yndyra', value: totals.fat, goal: result.fat, color: '#6E665C' },
            ]}
          />
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-center">
            <div>
              <p className="nums font-display text-xl font-bold text-gray-900">{Math.max(0, result.target - totals.kcal)}</p>
              <p className="label-mono mt-0.5">Mbeten</p>
            </div>
            <div>
              <p className="nums font-display text-xl font-bold text-gray-900">{totals.kcal}</p>
              <p className="label-mono mt-0.5">Marrë</p>
            </div>
            <div>
              <p className="nums font-display text-xl font-bold text-gray-900">{result.target}</p>
              <p className="label-mono mt-0.5">Objektiv</p>
            </div>
          </div>
        </Panel>

        {/* Water tracker */}
        <Panel title="Uji">
          <div className="flex flex-col items-center">
            <p className="nums font-display text-4xl font-bold text-gray-900">
              {(day.waterMl / 1000).toFixed(2)}
              <span className="ml-1 text-sm font-medium text-gray-400">L</span>
            </p>
            <p className="label-mono mt-1">nga {WATER_GOAL_ML / 1000} L</p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-7 w-5 rounded-md border ${
                    i < glasses ? 'border-coral-500 bg-coral-500' : 'border-gray-200 bg-gray-50'
                  }`}
                />
              ))}
            </div>
            <div className="mt-4 flex w-full gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => changeWater(-GLASS_ML)}>−</Button>
              <Button size="sm" className="flex-1 bg-coral-500 text-white hover:bg-coral-600" onClick={() => changeWater(GLASS_ML)}>
                + Gotë ({GLASS_ML}ml)
              </Button>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-coral-500 transition-all" style={{ width: `${waterPct}%` }} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Add food */}
        <Panel title="Shto ushqim" className="lg:col-span-2">
          {/* Food search */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Kërko ushqim (p.sh. pule, oriz, banane)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                {results.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => { logFood({ ...f, meal: form.meal }); setQuery('') }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-coral-50"
                  >
                    <span className="text-gray-800">{f.name}</span>
                    <span className="nums text-xs text-gray-400">{f.kcal} kcal · P{f.protein}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              className={inputCls}
              placeholder="Emri i ushqimit"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} type="number" placeholder="kcal" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} />
              <select className={inputCls} value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value as MealType })}>
                {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
                  <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className={inputCls} type="number" placeholder="P (g)" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
              <input className={inputCls} type="number" placeholder="K (g)" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
              <input className={inputCls} type="number" placeholder="Y (g)" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
            </div>
            <Button type="submit" className="w-full bg-coral-500 text-white hover:bg-coral-600">+ Shto në ditar</Button>
          </form>

          <p className="label-mono mt-5">Shtim i shpejtë</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_FOODS.map((f) => (
              <button
                key={f.name}
                onClick={() => logFood({ ...f, meal: form.meal })}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-coral-300 hover:bg-coral-50 hover:text-coral-700"
              >
                {f.name} · {f.kcal}
              </button>
            ))}
          </div>
        </Panel>

        {/* Food log */}
        <Panel title="Ditari i sotëm" className="lg:col-span-3">
          {day.foods.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed className="h-5 w-5" />} text="Ende s'ke shtuar ushqim sot. Shto vaktin e parë majtas." />
          ) : (
            <div className="space-y-4">
              {(Object.keys(MEAL_LABELS) as MealType[]).map((meal) => {
                const items = day.foods.filter((f) => f.meal === meal)
                if (items.length === 0) return null
                const sub = items.reduce((a, f) => a + f.kcal, 0)
                return (
                  <div key={meal}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="label-mono">{MEAL_LABELS[meal]}</p>
                      <span className="nums text-xs font-semibold text-gray-500">{sub} kcal</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{f.name}</p>
                            <p className="nums text-xs text-gray-400">P {f.protein} · K {f.carbs} · Y {f.fat}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="nums text-sm font-semibold text-gray-900">{f.kcal}</span>
                            <button
                              onClick={() => deleteFood(f.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-coral-50 hover:text-coral-600"
                              aria-label="Hiq"
                            >
                              X
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipe builder */}
        <Panel title="Recetat e mia">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input className={`${inputCls} col-span-2`} placeholder="Emri i recetës" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
              <input className={inputCls} type="number" min={1} placeholder="Porcione" value={recipeServings} onChange={(e) => setRecipeServings(e.target.value)} />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className={`${inputCls} pl-9`} placeholder="Shto përbërës…" value={recipeQuery} onChange={(e) => setRecipeQuery(e.target.value)} />
              {recipeResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {recipeResults.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => { setRecipeItems((p) => [...p, f]); setRecipeQuery('') }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-coral-50"
                    >
                      <span className="text-gray-800">{f.name}</span>
                      <span className="nums text-xs text-gray-400">{f.kcal} kcal</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {recipeItems.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-gray-100 p-2">
                {recipeItems.map((it, i) => (
                  <div key={`${it.name}-${i}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{it.name}</span>
                    <button onClick={() => setRecipeItems((p) => p.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-coral-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full bg-coral-500 text-white hover:bg-coral-600"
              disabled={!recipeName.trim() || recipeItems.length === 0}
              onClick={saveRecipe}
            >
              <ChefHat className="mr-1 h-4 w-4" /> Ruaj recetën
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {recipes.length === 0 ? (
              <EmptyState icon={<ChefHat className="h-5 w-5" />} text="Ende s'ke receta. Ndërto të parën më sipër." />
            ) : (
              recipes.map((r) => {
                const ps = recipePerServing(r)
                return (
                  <div key={r.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="nums text-xs text-gray-400">{r.servings} porcione · {ps.kcal} kcal/porcion · P{ps.protein} K{ps.carbs} Y{ps.fat}</p>
                      </div>
                      <button onClick={() => deleteRecipe(r.id)} className="text-gray-300 hover:text-coral-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => logFood({ name: `${r.name} (1 porcion)`, kcal: ps.kcal, protein: ps.protein, carbs: ps.carbs, fat: ps.fat, meal: form.meal })}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Shto 1 porcion në ditar
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </Panel>

        {/* Shopping list */}
        <Panel
          title="Lista e blerjes"
          action={shopping.some((i) => i.checked) ? (
            <button onClick={clearShop} className="text-xs font-semibold text-gray-500 hover:text-gray-900">Pastro të shënuarat</button>
          ) : undefined}
        >
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Shto artikull…"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addShop(shopInput) }}
            />
            <Button className="bg-coral-500 text-white hover:bg-coral-600" onClick={() => addShop(shopInput)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {recipes.length > 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-3">
              <p className="label-mono mb-2">Gjenero nga recetat</p>
              <div className="flex flex-wrap gap-2">
                {recipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      picked.includes(r.id) ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-3 bg-coral-500 text-white hover:bg-coral-600"
                disabled={picked.length === 0}
                onClick={generateShopping}
              >
                <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Shto përbërësit në listë
              </Button>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {shopping.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-5 w-5" />} text="Lista është bosh." />
            ) : (
              shopping.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={i.checked} onChange={() => toggleShop(i.id)} className="h-4 w-4 accent-coral-500" />
                    <span className={`text-sm ${i.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{i.name}</span>
                  </label>
                  <button onClick={() => deleteShop(i.id)} className="text-gray-300 hover:text-coral-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  )
}

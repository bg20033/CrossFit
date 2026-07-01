import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardShell, DashboardHeader, Panel } from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import {
  calcTdee,
  ACTIVITY_ORDER,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type Gender,
  type Goal,
  type ActivityLevel,
} from '../features/nutrition/tdee'
import { useNutritionProfile } from '../features/nutrition/profileStore'
import { useNotification } from '../contexts/NotificationContext'

/** Segmented control (gender / goal). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === o.value ? 'bg-coral-500 text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Labeled range slider with a live value chip. */
function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="nums font-display text-lg font-bold text-gray-900">
          {value}
          {unit && <span className="ml-0.5 text-xs font-medium text-gray-400">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-coral-500"
      />
    </div>
  )
}

export default function ClientOnboarding() {
  const navigate = useNavigate()
  const { addNotification } = useNotification()
  const saveProfile = useNutritionProfile((s) => s.saveProfile)
  const hydrateProfile = useNutritionProfile((s) => s.hydrate)
  const existing = useNutritionProfile((s) => s.input)

  const [gender, setGender] = useState<Gender>(existing?.gender ?? 'M')
  const [weightKg, setWeight] = useState(existing?.weightKg ?? 78)
  const [heightCm, setHeight] = useState(existing?.heightCm ?? 178)
  const [age, setAge] = useState(existing?.age ?? 28)
  const [activityIdx, setActivityIdx] = useState(
    existing ? ACTIVITY_ORDER.indexOf(existing.activity) : 2
  )
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'maintain')

  useEffect(() => {
    hydrateProfile().catch(() => {})
  }, [hydrateProfile])

  useEffect(() => {
    if (!existing) return
    setGender(existing.gender)
    setWeight(existing.weightKg)
    setHeight(existing.heightCm)
    setAge(existing.age)
    setActivityIdx(Math.max(0, ACTIVITY_ORDER.indexOf(existing.activity)))
    setGoal(existing.goal)
  }, [existing])

  const activity: ActivityLevel = ACTIVITY_ORDER[activityIdx]
  const result = useMemo(
    () => calcTdee({ gender, weightKg, heightCm, age, activity, goal }),
    [gender, weightKg, heightCm, age, activity, goal]
  )

  const macros = [
    { label: 'Proteina', value: result.protein, kcal: result.protein * 4, color: '#EE3A24' },
    { label: 'Karbohidrate', value: result.carbs, kcal: result.carbs * 4, color: '#1F9D55' },
    { label: 'Yndyra', value: result.fat, kcal: result.fat * 9, color: '#6E665C' },
  ]

  const save = async () => {
    try {
      await saveProfile({ gender, weightKg, heightCm, age, activity, goal })
      navigate('/nutrition')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Profili nuk u ruajt në server.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Konfigurimi"
        title="Le të njihemi me ty"
        subtitle="Përgjigju disa pyetjeve — llogarisim kaloritë ditore dhe makrot e tua automatikisht."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <div className="space-y-6 lg:col-span-3">
          <Panel title="Qëllimi yt">
            <Segmented
              value={goal}
              onChange={setGoal}
              options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
            />
            <p className="mt-3 text-sm text-gray-500">
              {goal === 'lose' && 'Deficit prej 500 kcal/ditë për humbje të qëndrueshme.'}
              {goal === 'maintain' && 'Kalori për mbajtjen e peshës aktuale.'}
              {goal === 'gain' && 'Suficit prej 400 kcal/ditë për shtim mase.'}
            </p>
          </Panel>

          <Panel title="Të dhënat e trupit">
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-600">Gjinia</span>
                <Segmented
                  value={gender}
                  onChange={setGender}
                  options={[
                    { value: 'M', label: 'Mashkull' },
                    { value: 'F', label: 'Femër' },
                  ]}
                />
              </div>
              <SliderRow label="Pesha" value={weightKg} min={40} max={160} unit="kg" onChange={setWeight} />
              <SliderRow label="Gjatësia" value={heightCm} min={140} max={210} unit="cm" onChange={setHeight} />
              <SliderRow label="Mosha" value={age} min={14} max={80} unit="vjeç" onChange={setAge} />
              <div>
                <SliderRow
                  label="Niveli i aktivitetit"
                  value={activityIdx + 1}
                  min={1}
                  max={5}
                  onChange={(v) => setActivityIdx(v - 1)}
                />
                <p className="mt-1.5 text-sm font-medium text-coral-700">{ACTIVITY_LABELS[activity]}</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* Live results */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-900 p-6 text-white">
              <p className="label-mono !text-white/50">Kaloritë e tua ditore</p>
              <p className="nums mt-1 font-display text-5xl font-bold tracking-tight">
                {result.target}
                <span className="ml-1 text-base font-medium text-white/50">kcal</span>
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-800 p-3">
                  <p className="label-mono !text-white/40">BMR</p>
                  <p className="nums font-display text-xl font-bold">{result.bmr}</p>
                </div>
                <div className="rounded-xl bg-gray-800 p-3">
                  <p className="label-mono !text-white/40">TDEE</p>
                  <p className="nums font-display text-xl font-bold">{result.tdee}</p>
                </div>
              </div>
            </div>

            <Panel title="Makrot ditore">
              <div className="space-y-3">
                {macros.map((m) => (
                  <div key={m.label} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm font-medium text-gray-700">{m.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="nums font-display text-lg font-bold text-gray-900">{m.value}g</span>
                      <span className="ml-1.5 text-xs text-gray-400">{m.kcal} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={save} className="mt-5 w-full bg-coral-500 text-white hover:bg-coral-600">
                Ruaj në profil →
              </Button>
            </Panel>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

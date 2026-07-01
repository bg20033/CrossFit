import { useState } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { generateWorkoutPDF } from '../utils/pdfGenerator'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  primaryBtn,
  Badge,
} from '../components/DashboardKit'

const SECTIONS = [
  { key: 'warmup', label: 'Warm-up' },
  { key: 'strength', label: 'Strength / Skill' },
  { key: 'wod', label: 'WOD' },
  { key: 'cooldown', label: 'Cool-down' },
] as const
type SectionKey = (typeof SECTIONS)[number]['key']

const SCALINGS = [
  { key: 'rx', label: 'Rx' },
  { key: 'scaled', label: 'Scaled' },
  { key: 'beginner', label: 'Beginner' },
] as const
type ScalingKey = (typeof SCALINGS)[number]['key']

const scalingLabel = (k: ScalingKey) => SCALINGS.find((s) => s.key === k)?.label ?? k

interface Exercise {
  id: string
  name: string
  section: SectionKey
  scaling: ScalingKey
  sets: number
  reps: number
  weight?: string
  restSeconds: number
  notes?: string
}

interface WorkoutDay {
  day: string
  exercises: Exercise[]
}

export default function TrainerWorkoutBuilder() {
  const { addNotification } = useNotification()
  const { profileId } = useAuth()
  const [clientId, setClientId] = useState<string>('')
  const [planName, setPlanName] = useState('')
  const [description, setDescription] = useState('')
  const [durationWeeks, setDurationWeeks] = useState('4')
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    { day: 'Monday', exercises: [] },
    { day: 'Tuesday', exercises: [] },
    { day: 'Wednesday', exercises: [] },
    { day: 'Thursday', exercises: [] },
    { day: 'Friday', exercises: [] },
    { day: 'Saturday', exercises: [] },
    { day: 'Sunday', exercises: [] }
  ])
  const [selectedDay, setSelectedDay] = useState(0)
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({
    id: '',
    name: '',
    section: 'wod',
    scaling: 'rx',
    sets: 3,
    reps: 10,
    weight: '',
    restSeconds: 60,
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [lastPlan, setLastPlan] = useState<any | null>(null)

  const addExercise = () => {
    if (!currentExercise.name) {
      addNotification('Gabim', 'Emri i ushtrimit është i detyrueshëm', 'error')
      return
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: currentExercise.name || '',
      section: currentExercise.section || 'wod',
      scaling: currentExercise.scaling || 'rx',
      sets: currentExercise.sets || 3,
      reps: currentExercise.reps || 10,
      weight: currentExercise.weight,
      restSeconds: currentExercise.restSeconds || 60,
      notes: currentExercise.notes
    }

    const newDays = [...workoutDays]
    newDays[selectedDay].exercises.push(exercise)
    setWorkoutDays(newDays)

    setCurrentExercise({
      id: '',
      name: '',
      section: currentExercise.section || 'wod',
      scaling: currentExercise.scaling || 'rx',
      sets: 3,
      reps: 10,
      weight: '',
      restSeconds: 60,
      notes: ''
    })

    addNotification('Sukses', `${exercise.name} u shtua te ${newDays[selectedDay].day}`, 'success')
  }

  const removeExercise = (dayIndex: number, exerciseId: string) => {
    const newDays = [...workoutDays]
    newDays[dayIndex].exercises = newDays[dayIndex].exercises.filter(e => e.id !== exerciseId)
    setWorkoutDays(newDays)
  }

  const savePlan = async () => {
    const parsedClientId = Number.parseInt(clientId, 10)
    const parsedWeeks = Number.parseInt(durationWeeks, 10)

    if (!profileId) {
      addNotification('Gabim', 'Profili i trajnerit nuk u gjet. Rihape llogarinë dhe provo përsëri.', 'error')
      return
    }
    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      addNotification('Gabim', 'Zgjidh një klient të vlefshëm për planin.', 'error')
      return
    }
    if (!Number.isInteger(parsedWeeks) || parsedWeeks <= 0) {
      addNotification('Gabim', 'Kohëzgjatja duhet të jetë së paku 1 javë.', 'error')
      return
    }
    if (!planName.trim() || !description.trim()) {
      addNotification('Gabim', 'Emri dhe përshkrimi i planit janë të detyrueshëm', 'error')
      return
    }

    try {
      setSaving(true)

      const content = {
        weeks: parseInt(durationWeeks),
        days: workoutDays
      }

      const workoutRes = await api.post('/workoutplans/create', {
        trainerId: profileId,
        clientId: parsedClientId,
        name: planName.trim(),
        description: description.trim(),
        durationWeeks: parsedWeeks,
        content: JSON.stringify(content),
        startDate: new Date(),
        endDate: null
      })

      await api.post('/trainer-reports', {
        trainerId: profileId,
        clientId: parsedClientId,
        workoutPlanId: workoutRes.data.id,
        weekStart: startOfWeek(new Date()),
        title: `${planName.trim()} · Java 1`,
        summary: description.trim(),
        goalsJson: JSON.stringify([{ label: 'Konsistencë', target: `${workoutDays.filter((d) => d.exercises.length > 0).length} ditë stërvitje` }]),
        workoutsJson: JSON.stringify(workoutDays),
        nutritionJson: '{}',
      })

      setLastPlan({
        id: workoutRes.data.id,
        name: planName,
        description,
        trainer: 'Trajner',
        clientName: `Klienti ${parsedClientId}`,
        startDate: new Date().toISOString(),
        durationWeeks: parsedWeeks,
        content: JSON.stringify(content),
      })

      addNotification('Sukses', `Plani "${planName}" u ruajt dhe raporti javor u krijua.`, 'success')

      // Reset form
      setPlanName('')
      setDescription('')
      setDurationWeeks('4')
      setWorkoutDays(workoutDays.map(d => ({ ...d, exercises: [] })))

    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ruajtja e planit dështoi', 'error')
    } finally {
      setSaving(false)
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <DashboardShell>
      <DashboardHeader
        title="Ndërtuesi i planeve të ushtrimeve"
        subtitle="Krijo plane stërvitore të detajuara për klientët"
        badge="Trajner"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Detajet e planit" className="lg:col-span-1 h-fit sticky top-4">
          <div className="space-y-4">
            <Field label="ID e klientit">
              <input
                type="number"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={fieldCls}
              />
            </Field>

            <Field label="Emri i planit">
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className={fieldCls}
              />
            </Field>

            <Field label="Përshkrimi">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={fieldCls}
              />
            </Field>

            <Field label="Kohëzgjatja (javë)">
              <input
                type="number"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                min="1"
                max="52"
                className={fieldCls}
              />
            </Field>

            <Button
              onClick={savePlan}
              disabled={saving}
              className={`w-full ${primaryBtn}`}>
              {saving ? 'Duke ruajtur…' : 'Ruaj planin'}
            </Button>
            {lastPlan && (
              <Button
                type="button"
                variant="outline"
                onClick={() => generateWorkoutPDF(lastPlan)}
                className="w-full"
              >
                Gjenero PDF për planin e fundit
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Ushtrime gjithsej:</strong> {workoutDays.reduce((sum, d) => sum + d.exercises.length, 0)}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Ditë me ushtrime:</strong> {workoutDays.filter(d => d.exercises.length > 0).length}/7
            </p>
          </div>
        </Panel>

        <div className="lg:col-span-2 space-y-6">
          <Panel title="Zgjidh ditën">
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(idx)}
                  className={`py-2 px-3 rounded-xl font-semibold transition ${selectedDay === idx
                    ? 'bg-coral-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                  {day.slice(0, 3)}
                  {workoutDays[idx].exercises.length > 0 && (
                    <span className="ml-1 bg-coral-600 text-white text-xs px-2 py-1 rounded-full">
                      {workoutDays[idx].exercises.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={`Shto ushtrim te ${daysOfWeek[selectedDay]}`}>
            <div className="space-y-4">
              <Field label="Emri i ushtrimit">
                <input
                  type="text"
                  value={currentExercise.name || ''}
                  onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                  className={fieldCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Seksioni">
                  <select
                    value={currentExercise.section || 'wod'}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, section: e.target.value as SectionKey })}
                    className={fieldCls}>
                    {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Scaling">
                  <select
                    value={currentExercise.scaling || 'rx'}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, scaling: e.target.value as ScalingKey })}
                    className={fieldCls}>
                    {SCALINGS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Seri">
                  <input
                    type="number"
                    value={currentExercise.sets || 3}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) })}
                    min="1"
                    className={fieldCls}
                  />
                </Field>
                <Field label="Përsëritje">
                  <input
                    type="number"
                    value={currentExercise.reps || 10}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) })}
                    min="1"
                    className={fieldCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Pesha">
                  <input
                    type="text"
                    value={currentExercise.weight || ''}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, weight: e.target.value })}
                    className={fieldCls}
                  />
                </Field>
                <Field label="Pushimi (sekonda)">
                  <input
                    type="number"
                    value={currentExercise.restSeconds || 60}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, restSeconds: parseInt(e.target.value) })}
                    min="0"
                    className={fieldCls}
                  />
                </Field>
              </div>

              <Field label="Shënime">
                <textarea
                  value={currentExercise.notes || ''}
                  onChange={(e) => setCurrentExercise({ ...currentExercise, notes: e.target.value })}
                  rows={2}
                  className={fieldCls}
                />
              </Field>

              <Button onClick={addExercise} className={`w-full ${primaryBtn}`}>
                Shto ushtrim
              </Button>
            </div>
          </Panel>

          {workoutDays[selectedDay].exercises.length > 0 && (
            <Panel title={`Ushtrimet për ${daysOfWeek[selectedDay]} (${workoutDays[selectedDay].exercises.length})`}>
              <div className="space-y-5">
                {SECTIONS.map((sec) => {
                  const items = workoutDays[selectedDay].exercises.filter((e) => e.section === sec.key)
                  if (items.length === 0) return null
                  return (
                    <div key={sec.key}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-coral-600">{sec.label}</p>
                      <div className="space-y-3">
                        {items.map((exercise) => (
                          <div key={exercise.id} className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-lg text-gray-900">
                                  {exercise.name}
                                  <span className="ml-2 align-middle">
                                    <Badge>{scalingLabel(exercise.scaling)}</Badge>
                                  </span>
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {exercise.sets} sets × {exercise.reps} reps
                                  {exercise.weight && ` @ ${exercise.weight}`}
                                  {exercise.restSeconds ? ` | Rest: ${exercise.restSeconds}s` : ''}
                                </p>
                              </div>
                              <button
                                onClick={() => removeExercise(selectedDay, exercise.id)}
                                className="text-gray-400 hover:text-gray-700 text-xl">
                                X
                              </button>
                            </div>
                            {exercise.notes && (
                              <p className="text-sm text-gray-700 italic">{exercise.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

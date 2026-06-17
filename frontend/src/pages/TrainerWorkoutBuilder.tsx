import { useState } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

interface Exercise {
  id: string
  name: string
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
  const [clientId, setClientId] = useState<string>('1')
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
    sets: 3,
    reps: 10,
    weight: '',
    restSeconds: 60,
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const addExercise = () => {
    if (!currentExercise.name) {
      addNotification('Error', 'Exercise name is required', 'error')
      return
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: currentExercise.name || '',
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
      sets: 3,
      reps: 10,
      weight: '',
      restSeconds: 60,
      notes: ''
    })

    addNotification('Success', `${exercise.name} added to ${newDays[selectedDay].day}`, 'success')
  }

  const removeExercise = (dayIndex: number, exerciseId: string) => {
    const newDays = [...workoutDays]
    newDays[dayIndex].exercises = newDays[dayIndex].exercises.filter(e => e.id !== exerciseId)
    setWorkoutDays(newDays)
  }

  const savePlan = async () => {
    if (!planName || !description) {
      addNotification('Error', 'Plan name and description are required', 'error')
      return
    }

    try {
      setSaving(true)

      const content = {
        weeks: parseInt(durationWeeks),
        days: workoutDays
      }

      await api.post('/workoutplans/create', {
        trainerId: profileId ?? 1,
        clientId: parseInt(clientId),
        name: planName,
        description: description,
        durationWeeks: parseInt(durationWeeks),
        content: JSON.stringify(content),
        startDate: new Date(),
        endDate: null
      })

      addNotification('Success', `Workout plan "${planName}" created successfully!`, 'success')

      // Reset form
      setPlanName('')
      setDescription('')
      setDurationWeeks('4')
      setWorkoutDays(workoutDays.map(d => ({ ...d, exercises: [] })))

    } catch (err: any) {
      addNotification('Error', err.response?.data?.message || 'Failed to save plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="w-full">
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">💪 Workout Plan Builder</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Plan Details */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit sticky top-4">
            <h2 className="text-2xl font-semibold mb-4">Plan Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Client ID</label>
                <input
                  type="number"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Plan Name</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., 4-Week Strength Builder"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Plan details and goals..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Duration (weeks)</label>
                <input
                  type="number"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  min="1"
                  max="52"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button
                onClick={savePlan}
                disabled={saving}
                className="w-full">
                {saving ? 'Saving...' : '💾 Save Plan'}
              </Button>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Total Exercises:</strong> {workoutDays.reduce((sum, d) => sum + d.exercises.length, 0)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Days with exercises:</strong> {workoutDays.filter(d => d.exercises.length > 0).length}/7
              </p>
            </div>
          </div>

          {/* Right Panel - Exercise Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Day Selector */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">Select Day</h2>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(idx)}
                    className={`py-2 px-3 rounded-lg font-semibold transition ${selectedDay === idx
                      ? 'bg-coral-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                    {day.slice(0, 3)}
                    {workoutDays[idx].exercises.length > 0 && (
                      <span className="ml-1 bg-coral-600 text-white text-xs px-2 py-1 rounded">
                        {workoutDays[idx].exercises.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Exercise Form */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Add Exercise to {daysOfWeek[selectedDay]}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Exercise Name</label>
                  <input
                    type="text"
                    value={currentExercise.name || ''}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                    placeholder="e.g., Bench Press"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Sets</label>
                    <input
                      type="number"
                      value={currentExercise.sets || 3}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) })}
                      min="1"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Reps</label>
                    <input
                      type="number"
                      value={currentExercise.reps || 10}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) })}
                      min="1"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Weight</label>
                    <input
                      type="text"
                      value={currentExercise.weight || ''}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, weight: e.target.value })}
                      placeholder="e.g., 100kg"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Rest (seconds)</label>
                    <input
                      type="number"
                      value={currentExercise.restSeconds || 60}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, restSeconds: parseInt(e.target.value) })}
                      min="0"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    value={currentExercise.notes || ''}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, notes: e.target.value })}
                    placeholder="Form cues, breathing, etc."
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <Button onClick={addExercise} className="w-full">
                  ➕ Add Exercise
                </Button>
              </div>
            </div>

            {/* Exercises List */}
            {workoutDays[selectedDay].exercises.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">
                  Exercises for {daysOfWeek[selectedDay]} ({workoutDays[selectedDay].exercises.length})
                </h3>

                <div className="space-y-3">
                  {workoutDays[selectedDay].exercises.map((exercise) => (
                    <div key={exercise.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{exercise.name}</h4>
                          <p className="text-sm text-gray-600">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight && ` @ ${exercise.weight}`}
                            {exercise.restSeconds && ` | Rest: ${exercise.restSeconds}s`}
                          </p>
                        </div>
                        <button
                          onClick={() => removeExercise(selectedDay, exercise.id)}
                          className="text-gray-400 hover:text-gray-700 text-xl">
                          ✕
                        </button>
                      </div>
                      {exercise.notes && (
                        <p className="text-sm text-gray-700 italic">💡 {exercise.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

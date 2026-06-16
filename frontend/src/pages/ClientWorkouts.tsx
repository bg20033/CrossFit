import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import { generateWorkoutPDF } from '../utils/pdfGenerator'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  EmptyState,
  Badge,
  Modal,
} from '../components/DashboardKit'

interface WorkoutPlan {
  id: number
  name: string
  description: string
  trainer: string
  startDate: string
  endDate: string
  durationWeeks: number
  isActive: boolean
  content: string
}

export default function ClientWorkouts() {
  const { user, profileId } = useAuth()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WorkoutPlan | null>(null)

  useEffect(() => {
    if (profileId == null) return
    fetchPlans()
  }, [profileId])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/workoutplans?clientId=${profileId}`)
      setPlans(res.data.plans || [])
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = (plan: WorkoutPlan) => {
    generateWorkoutPDF({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      trainer: plan.trainer,
      clientName: user?.name || '',
      startDate: plan.startDate,
      durationWeeks: plan.durationWeeks,
      content: plan.content,
    }).catch(() => {})
  }

  return (
    <DashboardShell>
      <DashboardHeader badge="Klient" title="Planet e mia të Ushtrimeve" subtitle="Planet e caktuara nga trajneri yt." />

      <Panel title="Planet" action={<Badge accent="gray">{plans.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : plans.length === 0 ? (
          <EmptyState icon="💪" text="Ende s'ke plan ushtrimesh. Kontakto trajnerin tënd." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan)}
                className="rounded-xl border border-gray-200 p-5 text-left transition hover:border-gray-300"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  {plan.isActive && <Badge accent="green">Aktiv</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-4 space-y-1 text-sm text-gray-600">
                  <p><span className="text-gray-400">Trajneri:</span> {plan.trainer}</p>
                  <p><span className="text-gray-400">Kohëzgjatja:</span> {plan.durationWeeks} javë</p>
                  <p><span className="text-gray-400">Fillim:</span> {shortDate(plan.startDate)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Trajneri</p>
                <p className="font-semibold text-gray-800">{selected.trainer}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Kohëzgjatja</p>
                <p className="font-semibold text-gray-800">{selected.durationWeeks} javë</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Fillim</p>
                <p className="font-semibold text-gray-800">{shortDate(selected.startDate)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Statusi</p>
                <p className="font-semibold text-gray-800">{selected.isActive ? 'Aktiv' : 'Pasiv'}</p>
              </div>
            </div>
            <Button onClick={() => downloadPDF(selected)} className="w-full bg-gray-900 text-white hover:bg-gray-800">
              📥 Shkarko PDF
            </Button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}

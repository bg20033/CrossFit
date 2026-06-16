import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import { generateDietPDF } from '../utils/pdfGenerator'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  EmptyState,
  Badge,
  Modal,
} from '../components/DashboardKit'

interface DietPlan {
  id: number
  name: string
  description: string
  trainer: string
  startDate: string
  endDate: string
  isActive: boolean
  content: string
}

export default function ClientDiet() {
  const { user, profileId } = useAuth()
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DietPlan | null>(null)

  useEffect(() => {
    if (profileId == null) return
    fetchPlans()
  }, [profileId])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/dietplans?clientId=${profileId}`)
      setPlans(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = (plan: DietPlan) => {
    generateDietPDF({ ...plan, clientName: user?.name || '' }).catch(() => {})
  }

  let parsedContent = ''
  if (selected) {
    try {
      parsedContent = JSON.stringify(JSON.parse(selected.content || '{}'), null, 2)
    } catch {
      parsedContent = selected.content || ''
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader badge="Klient" title="Planet e mia të Dietës" subtitle="Plani ushqimor i caktuar nga trajneri yt." />

      <Panel title="Planet" action={<Badge accent="gray">{plans.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : plans.length === 0 ? (
          <EmptyState icon="🍽️" text="Ende s'ke plan diete. Kontakto trajnerin tënd." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan)}
                className="rounded-xl border border-gray-200 p-5 text-left transition hover:border-gray-300"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">🍽️ {plan.name}</h3>
                  {plan.isActive && <Badge accent="green">Aktiv</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-4 space-y-1 text-sm text-gray-600">
                  <p><span className="text-gray-400">Trajneri:</span> {plan.trainer}</p>
                  <p><span className="text-gray-400">Fillim:</span> {shortDate(plan.startDate)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {selected && (
        <Modal title={`🍽️ ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Trajneri</p>
                <p className="font-semibold text-gray-800">{selected.trainer}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Statusi</p>
                <p className="font-semibold text-gray-800">{selected.isActive ? 'Aktiv' : 'Pasiv'}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Plani i ushqimit</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{parsedContent}</pre>
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

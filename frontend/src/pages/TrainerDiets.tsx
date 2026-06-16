import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  primaryBtn,
} from '../components/DashboardKit'

interface DietPlan {
  id: number
  name: string
  trainer: string
  client: string
  startDate?: string
  isActive: boolean
}

const empty = { clientId: '', name: '', description: '', content: '' }

export default function TrainerDiets() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (profileId == null) return
    fetchPlans()
  }, [profileId])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/dietplans?trainerId=${profileId}`)
      setPlans(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Ngarkimi i planeve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/dietplans/create', {
        trainerId: profileId ?? 1,
        clientId: parseInt(form.clientId),
        name: form.name,
        description: form.description,
        content: form.content || '{}',
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Plani i dietës u krijua.', 'success')
      fetchPlans()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Krijimi i planit dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Trajner"
        title="Planet e Dietës"
        subtitle="Krijo dhe menaxho planet ushqimore për klientët."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Plan i ri'}
          </Button>
        }
      />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Krijo plan diete">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Client ID"><input type="number" name="clientId" value={form.clientId} onChange={change} required className={fieldCls} /></Field>
              <Field label="Emri i planit"><input name="name" value={form.name} onChange={change} required className={fieldCls} /></Field>
            </div>
            <Field label="Përshkrimi"><textarea name="description" value={form.description} onChange={change} rows={2} className={fieldCls} /></Field>
            <Field label="Përmbajtja (JSON: vakte, kalori, makros)">
              <textarea name="content" value={form.content} onChange={change} rows={3} placeholder='{"meals":[]}' className={`${fieldCls} font-mono`} />
            </Field>
            <Button type="submit" className={primaryBtn}>Krijo planin</Button>
          </form>
        </Panel>
      )}

      <Panel title="Planet" action={<Badge accent="gray">{plans.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : plans.length === 0 ? (
          <EmptyState icon="🍽️" text="Ende s'ke plane diete. Krijo të parin me '+ Plan i ri'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Plani</th>
                  <th className="px-3 py-2 font-semibold">Klienti</th>
                  <th className="px-3 py-2 font-semibold">Fillim</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-3 py-3 text-gray-600">{p.client}</td>
                    <td className="px-3 py-3 text-gray-600">{p.startDate ? shortDate(p.startDate) : '—'}</td>
                    <td className="px-3 py-3"><Badge accent={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Aktiv' : 'Pasiv'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

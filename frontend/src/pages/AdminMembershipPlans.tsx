import { Ticket, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import PricingTabs from '../components/app/PricingTabs'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Plan {
  id: number
  name: string
  durationDays: number
  price: number
  description: string
  isActive: boolean
}
interface ClientLite {
  id: number
  name: string
  email: string
  membershipType: string
  isActive: boolean
}

const empty = { name: '', durationDays: '30', price: '0', description: '', isActive: true }

export default function AdminMembershipPlans() {
  const { addNotification } = useNotification()
  const [plans, setPlans] = useState<Plan[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [editForm, setEditForm] = useState(empty)
  const [viewPlan, setViewPlan] = useState<Plan | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [p, c] = await Promise.allSettled([api.get('/membershipplans'), api.get('/clients?page=1&pageSize=500')])
      if (p.status === 'fulfilled') setPlans(Array.isArray(p.value.data) ? p.value.data : [])
      if (c.status === 'fulfilled') setClients(c.value.data.clients ?? [])
    } finally {
      setLoading(false)
    }
  }

  const countFor = (name: string) => clients.filter((c) => c.membershipType === name).length

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/membershipplans', {
        name: form.name,
        durationDays: parseInt(form.durationDays),
        price: toDecimal(form.price),
        description: form.description,
        isActive: form.isActive,
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Pakoja u krijua.', 'success')
      fetchAll()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Krijimi dështoi.', 'error')
    }
  }

  const openEdit = (p: Plan) => {
    setEditPlan(p)
    setEditForm({
      name: p.name,
      durationDays: String(p.durationDays),
      price: String(p.price),
      description: p.description,
      isActive: p.isActive,
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPlan) return
    try {
      await api.put(`/membershipplans/${editPlan.id}`, {
        name: editForm.name,
        durationDays: parseInt(editForm.durationDays),
        price: toDecimal(editForm.price),
        description: editForm.description,
        isActive: editForm.isActive,
      })
      addNotification('Sukses', 'Pakoja u përditësua.', 'success')
      setEditPlan(null)
      fetchAll()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Përditësimi dështoi.', 'error')
    }
  }

  const toggleActive = async (p: Plan) => {
    try {
      await api.put(`/membershipplans/${p.id}`, {
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        description: p.description,
        isActive: !p.isActive,
      })
      fetchAll()
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  const remove = async (p: Plan) => {
    const n = countFor(p.name)
    if (!confirm(n > 0 ? `${n} klientë janë në "${p.name}". Fshije gjithsesi?` : `Fshij pakon "${p.name}"?`)) return
    try {
      await api.delete(`/membershipplans/${p.id}`)
      addNotification('Fshirë', 'Pakoja u fshi.', 'success')
      fetchAll()
    } catch {
      addNotification('Gabim', 'Fshirja dështoi.', 'error')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const changeEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const planClients = viewPlan ? clients.filter((c) => c.membershipType === viewPlan.name) : []

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Pakot e Anëtarësimit"
        subtitle="Emri, kohëzgjatja, çmimi dhe përshkrimi i pakove."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Pako e re'}
          </Button>
        }
      />

      <PricingTabs />

      {showForm && (
        <Panel title="Krijo pako">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Emri"><input name="name" value={form.name} onChange={change} required placeholder="p.sh. Mujore" className={fieldCls} /></Field>
              <Field label="Kohëzgjatja (ditë)"><input type="number" name="durationDays" value={form.durationDays} onChange={change} required className={fieldCls} /></Field>
              <Field label="Çmimi (€)"><input type="text" inputMode="decimal" name="price" value={form.price} onChange={change} required className={fieldCls} /></Field>
            </div>
            <Field label="Përshkrimi"><input name="description" value={form.description} onChange={change} className={fieldCls} /></Field>
            <Field label="Aktive">
              <select name="isActive" value={String(form.isActive)} onChange={change} className={fieldCls}>
                <option value="true">Po</option>
                <option value="false">Jo</option>
              </select>
            </Field>
            <Button type="submit" className={primaryBtn}>Krijo pakon</Button>
          </form>
        </Panel>
      )}

      <Panel title="Pakot" action={<Badge accent="gray">{plans.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : plans.length === 0 ? (
          <EmptyState icon={<Ticket className="h-5 w-5" />} text="Ende s'ka pako. Krijo të parën me '+ Pako e re'." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const n = countFor(p.name)
              return (
                <div key={p.id} className="flex flex-col rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                    <Badge accent={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Aktive' : 'Joaktive'}</Badge>
                  </div>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{eur(p.price)}</p>
                  <p className="text-sm text-gray-500">{p.durationDays} ditë</p>
                  {p.description && <p className="mt-2 text-sm text-gray-500">{p.description}</p>}
                  <button onClick={() => setViewPlan(p)} className="mt-3 text-left text-sm font-medium text-gray-700 hover:underline">
                    {n} klient{n === 1 ? '' : 'ë'} →
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2 pt-2">
                    <Button size="sm" className={primaryBtn} onClick={() => openEdit(p)}>Edito</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>{p.isActive ? 'Çaktivizo' : 'Aktivizo'}</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p)}>Fshij</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {editPlan && (
        <Modal title={`Edito — ${editPlan.name}`} onClose={() => setEditPlan(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label="Emri"><input name="name" value={editForm.name} onChange={changeEdit} required className={fieldCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kohëzgjatja (ditë)"><input type="number" name="durationDays" value={editForm.durationDays} onChange={changeEdit} required className={fieldCls} /></Field>
              <Field label="Çmimi (€)"><input type="text" inputMode="decimal" name="price" value={editForm.price} onChange={changeEdit} required className={fieldCls} /></Field>
            </div>
            <Field label="Përshkrimi"><input name="description" value={editForm.description} onChange={changeEdit} className={fieldCls} /></Field>
            <Field label="Aktive">
              <select name="isActive" value={String(editForm.isActive)} onChange={changeEdit} className={fieldCls}>
                <option value="true">Po</option>
                <option value="false">Jo</option>
              </select>
            </Field>
            <Button type="submit" className={`w-full ${primaryBtn}`}>Ruaj ndryshimet</Button>
          </form>
        </Modal>
      )}

      {viewPlan && (
        <Modal title={`Klientët — ${viewPlan.name}`} onClose={() => setViewPlan(null)}>
          {planClients.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} text="Asnjë klient në këtë pako ende." />
          ) : (
            <div className="space-y-2">
              {planClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                  <Badge accent={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Aktiv' : 'Pasiv'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </DashboardShell>
  )
}

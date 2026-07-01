import { Building, CheckCircle, Mail, Plus, Star, Trash2, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Inquiry {
  id: number
  name: string
  email: string
  phone: string
  message: string
  status: string
  createdAt: string
}

interface TenantSlot {
  dayOfWeek: string
  startMin: number
  endMin: number
}
interface Tenant {
  id: number
  userId: number
  trainer: string
  businessName: string
  contractStatus: string
  monthlyRate: number
  slots: TenantSlot[]
  balanceDue: number
}
interface UserOption {
  id: number
  name: string
  email: string
  baselineRole: string
}

const STATUSES = [
  { key: 'new', label: 'Të reja' },
  { key: 'contacted', label: 'Kontaktuar' },
  { key: 'approved', label: 'Aprovuar' },
  { key: 'rejected', label: 'Refuzuar' },
]
const statusLabel: Record<string, string> = { new: 'I ri', contacted: 'Kontaktuar', approved: 'Aprovuar', rejected: 'Refuzuar' }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}
const DAY_SHORT: Record<string, string> = {
  Monday: 'Hën', Tuesday: 'Mar', Wednesday: 'Mër', Thursday: 'Enj',
  Friday: 'Pre', Saturday: 'Sht', Sunday: 'Die',
}
const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const hhmmToMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
interface SlotForm {
  dayOfWeek: string
  start: string
  end: string
}
const newSlot = (): SlotForm => ({ dayOfWeek: 'Monday', start: '18:00', end: '19:30' })
const emptyTenantForm = () => ({ id: 0, userId: '', businessName: '', monthlyRate: '0', slots: [newSlot()] })
type TenantForm = ReturnType<typeof emptyTenantForm>

export default function AdminRentals() {
  const { addNotification } = useNotification()
  const [items, setItems] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [tenantForm, setTenantForm] = useState<TenantForm>(emptyTenantForm())
  const [tenantError, setTenantError] = useState('')

  useEffect(() => {
    fetchItems()
  }, [filter])

  useEffect(() => {
    fetchTenants()
    api.get('/roles/users')
      .then((r) => setUsers(Array.isArray(r.data) ? r.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email, baselineRole: u.baselineRole })) : []))
      .catch(() => setUsers([]))
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/rentals${filter ? `?status=${filter}` : ''}`)
      setItems(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      setTenantsLoading(true)
      const res = await api.get('/rentals/tenants')
      setTenants(Array.isArray(res.data) ? res.data : [])
    } catch {
      setTenants([])
    } finally {
      setTenantsLoading(false)
    }
  }

  const setStatus = async (id: number, status: string) => {
    try {
      await api.put(`/rentals/${id}/status`, { status })
      addNotification('Ruajtur', `Statusi: ${statusLabel[status]}`, 'success')
      fetchItems()
    } catch {
      addNotification('Gabim', 'Përditësimi dështoi.', 'error')
    }
  }

  const openCreateTenant = () => {
    setTenantForm(emptyTenantForm())
    setTenantError('')
    setShowTenantForm(true)
  }

  const addSlotRow = () => setTenantForm((f) => ({ ...f, slots: [...f.slots, newSlot()] }))
  const removeSlotRow = (i: number) =>
    setTenantForm((f) => ({ ...f, slots: f.slots.length > 1 ? f.slots.filter((_, idx) => idx !== i) : f.slots }))
  const changeSlot = (i: number, key: keyof SlotForm, value: string) =>
    setTenantForm((f) => ({ ...f, slots: f.slots.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }))

  const submitTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setTenantError('')
    if (!tenantForm.userId) {
      setTenantError('Zgjedh një përdorues për ta bërë qiragji.')
      return
    }
    for (const s of tenantForm.slots) {
      if (hhmmToMin(s.start) >= hhmmToMin(s.end)) {
        setTenantError('Çdo terminë duhet të ketë orën e fillimit para mbarimit.')
        return
      }
    }
    const body = {
      userId: parseInt(tenantForm.userId),
      businessName: tenantForm.businessName || undefined,
      monthlyRate: parseFloat(tenantForm.monthlyRate) || 0,
      slots: tenantForm.slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startMin: hhmmToMin(s.start), endMin: hhmmToMin(s.end) })),
    }
    try {
      await api.post('/rentals/tenants', body)
      addNotification('Sukses', 'Qiragjia u krijua.', 'success')
      setShowTenantForm(false)
      fetchTenants()
    } catch (err: any) {
      setTenantError(err.response?.data?.message || 'Krijimi dështoi.')
    }
  }

  const newCount = items.filter((i) => i.status === 'new').length

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Qira"
        title="Qiragjinjtë"
        subtitle="Kërkesat për qira, dhe qiragjinjtë aktivë me orarin e tyre javor."
        right={<Button onClick={openCreateTenant} className={primaryBtn}>+ Qiragji i ri</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Mail className="h-5 w-5" />} label="Gjithsej kërkesa" value={loading ? '…' : items.length} />
        <StatCard icon={<Star className="h-5 w-5" />} label="Të reja" value={loading ? '…' : newCount} />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Aprovuar" value={loading ? '…' : items.filter((i) => i.status === 'approved').length} />
      </div>

      <Panel title="Qiragjinjtë aktivë" action={<Badge accent="green">{tenants.length}</Badge>}>
        {tenantsLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : tenants.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text="Ende s'ka qiragjinjtë. Krijo të parin me '+ Qiragji i ri'." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((t) => (
              <div key={t.id} className="rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{t.businessName}</h3>
                  <Badge accent={t.contractStatus === 'active' ? 'green' : 'gray'}>{t.contractStatus}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">Qiragji: {t.trainer} · €{t.monthlyRate}/muaj</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.slots.length === 0 ? (
                    <span className="text-xs text-gray-400">Pa orar</span>
                  ) : (
                    t.slots.map((s, i) => (
                      <span key={i} className="rounded-lg bg-coral-50 px-2 py-1 text-[11px] font-medium text-coral-700">
                        {DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek} {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
                      </span>
                    ))
                  )}
                </div>
                {t.balanceDue > 0 && (
                  <div className="mt-3"><Badge accent="orange">Borxh €{t.balanceDue}</Badge></div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Kërkesat"
        action={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button onClick={() => setFilter('')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === '' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Të gjitha</button>
            {STATUSES.map((s) => (
              <button key={s.key} onClick={() => setFilter(s.key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === s.key ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={<Building className="h-5 w-5" />} text="S'ka kërkesa për qira. Vijnë nga forma publike te /rental." />
        ) : (
          <div className="space-y-3">
            {items.map((q) => (
              <div key={q.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{q.name} <Badge accent={q.status === 'approved' ? 'green' : 'gray'}>{statusLabel[q.status] ?? q.status}</Badge></p>
                    <p className="text-sm text-gray-500">{q.email} · {q.phone || '—'}</p>
                    <p className="mt-2 text-sm text-gray-700">{q.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{shortDate(q.createdAt)}</p>
                  </div>
                  <select value={q.status} onChange={(e) => setStatus(q.id, e.target.value)} className={`${fieldCls} w-40`}>
                    {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showTenantForm && (
        <Modal title="Krijo qiragji të ri" onClose={() => setShowTenantForm(false)}>
          <form onSubmit={submitTenant} className="space-y-4">
            {tenantError && (
              <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{tenantError}</div>
            )}
            <Field label="Përdoruesi">
              <select value={tenantForm.userId} onChange={(e) => setTenantForm({ ...tenantForm, userId: e.target.value })} required className={fieldCls}>
                <option value="" disabled>Zgjedh përdoruesin…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email}) · {u.baselineRole}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri i hapësirës">
                <input value={tenantForm.businessName} onChange={(e) => setTenantForm({ ...tenantForm, businessName: e.target.value })} placeholder="p.sh. Studio e Ardit" className={fieldCls} />
              </Field>
              <Field label="Qiraja mujore (€)">
                <input type="number" min="0" step="0.01" value={tenantForm.monthlyRate} onChange={(e) => setTenantForm({ ...tenantForm, monthlyRate: e.target.value })} className={fieldCls} />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Orari javor (sa herë në javë, koha, kohëzgjatja)</label>
                <Button type="button" size="sm" variant="outline" onClick={addSlotRow}>
                  <Plus className="mr-1 h-4 w-4" /> Terminë
                </Button>
              </div>
              <div className="space-y-2">
                {tenantForm.slots.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-gray-200 p-2">
                    <select value={s.dayOfWeek} onChange={(e) => changeSlot(i, 'dayOfWeek', e.target.value)} className={fieldCls}>
                      {DAYS.map((d) => <option key={d} value={d}>{DAY_AL[d]}</option>)}
                    </select>
                    <input type="time" value={s.start} onChange={(e) => changeSlot(i, 'start', e.target.value)} className={fieldCls} />
                    <input type="time" value={s.end} onChange={(e) => changeSlot(i, 'end', e.target.value)} className={fieldCls} />
                    <button
                      type="button"
                      onClick={() => removeSlotRow(i)}
                      disabled={tenantForm.slots.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-coral-600 disabled:opacity-30"
                      aria-label="Largo terminën"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTenantForm(false)}>Anulo</Button>
              <Button type="submit" className={primaryBtn}>Krijo qiragjinë</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}

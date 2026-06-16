import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate, eur } from '../utils/format'
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

interface Client {
  id: number
  name: string
  email: string
  membershipType: string
  membershipExpiry: string
  isActive: boolean
  trainer?: string
}
interface Goal { id: number; title: string; status: string }
interface ClientDetail {
  id: number
  name: string
  email: string
  membershipType: string
  membershipExpiry: string | null
  isActive: boolean
  trainer?: string | null
  startDate: string
  totalCheckIns: number
  goals: Goal[]
}
interface AttendanceRecord { id: number; date: string; checkIn: string | null; checkOut: string | null; duration: number | null }
interface AttendanceData { month: string; totalCheckIns: number; totalDays: number; attendance: AttendanceRecord[] }
interface Plan { id: number; name: string; price: number; durationDays: number }

const empty = { name: '', email: '', password: '', membershipType: '', membershipPrice: '0' }
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '—')
const dateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

export default function AdminClients() {
  const { addNotification } = useNotification()
  const [clients, setClients] = useState<Client[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  // detail / edit / attendance (inside one modal)
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', membershipType: '', isActive: 'true', membershipExpiry: '' })
  const [att, setAtt] = useState<AttendanceData | null>(null)

  useEffect(() => {
    api.get('/membershipplans?activeOnly=true').then((r) => {
      const list: Plan[] = Array.isArray(r.data) ? r.data : []
      setPlans(list)
      if (list[0]) setForm((f) => ({ ...f, membershipType: list[0].name, membershipPrice: String(list[0].price) }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchClients()
  }, [search])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await api.get(`/clients${params}`)
      setClients(res.data.clients ?? [])
    } catch {
      setError('Ngarkimi i klientëve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const selectCreatePlan = (name: string) => {
    const p = plans.find((x) => x.name === name)
    setForm((f) => ({ ...f, membershipType: name, membershipPrice: p ? String(p.price) : f.membershipPrice }))
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/clients/create', { ...form, membershipPrice: parseFloat(form.membershipPrice) })
      setShowForm(false)
      setForm({ ...empty, membershipType: plans[0]?.name ?? '', membershipPrice: String(plans[0]?.price ?? 0) })
      addNotification('Sukses', 'Klienti u krijua.', 'success')
      fetchClients()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Krijimi i klientit dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  // ---- detail modal ----
  const openDetail = async (id: number) => {
    setEditing(false)
    setAtt(null)
    setDetail(null)
    try {
      const res = await api.get(`/clients/${id}`)
      setDetail(res.data)
    } catch {
      addNotification('Gabim', 'Ngarkimi i klientit dështoi.', 'error')
    }
  }

  const startEdit = () => {
    if (!detail) return
    setEditForm({
      name: detail.name,
      membershipType: detail.membershipType,
      isActive: String(detail.isActive),
      membershipExpiry: dateInput(detail.membershipExpiry),
    })
    setEditing(true)
  }

  const selectEditPlan = (name: string) => {
    const p = plans.find((x) => x.name === name)
    setEditForm((f) => ({ ...f, membershipType: name, membershipExpiry: p ? addDays(p.durationDays) : f.membershipExpiry }))
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail) return
    try {
      await api.put(`/clients/${detail.id}`, {
        name: editForm.name,
        membershipType: editForm.membershipType,
        isActive: editForm.isActive === 'true',
        membershipExpiry: editForm.membershipExpiry ? new Date(editForm.membershipExpiry) : null,
      })
      addNotification('Sukses', 'Klienti u përditësua.', 'success')
      setEditing(false)
      await openDetail(detail.id)
      fetchClients()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Përditësimi dështoi.', 'error')
    }
  }

  const del = async () => {
    if (!detail) return
    if (!confirm(`Fshij klientin "${detail.name}"?`)) return
    try {
      await api.delete(`/clients/${detail.id}`)
      addNotification('Fshirë', 'Klienti u fshi.', 'success')
      setDetail(null)
      fetchClients()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Fshirja dështoi.', 'error')
    }
  }

  const checkIn = async () => {
    if (!detail) return
    try {
      await api.post(`/clients/${detail.id}/check-in`)
      addNotification('Check-In', 'Klienti u regjistrua si i pranishëm.', 'success')
      openDetail(detail.id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Check-in dështoi.', 'error')
    }
  }

  const loadAttendance = async () => {
    if (!detail) return
    try {
      const res = await api.get(`/clients/${detail.id}/attendance`)
      setAtt(res.data)
    } catch {
      addNotification('Gabim', 'Ngarkimi i prezencës dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Klientët"
        subtitle="Shto, shiko brenda, edito dhe lidh klientët me pakot."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Klient i ri'}
          </Button>
        }
      />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Shto klient të ri">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri"><input name="name" value={form.name} onChange={change} required className={fieldCls} /></Field>
              <Field label="Email"><input type="email" name="email" value={form.email} onChange={change} required className={fieldCls} /></Field>
              <Field label="Fjalëkalimi"><input type="password" name="password" value={form.password} onChange={change} required className={fieldCls} /></Field>
              <Field label="Pakoja e anëtarësimit">
                {plans.length === 0 ? (
                  <input name="membershipType" value={form.membershipType} onChange={change} placeholder="Krijo pako te 'Pakot'" className={fieldCls} />
                ) : (
                  <select value={form.membershipType} onChange={(e) => selectCreatePlan(e.target.value)} className={fieldCls}>
                    {plans.map((p) => <option key={p.id} value={p.name}>{p.name} — {p.durationDays} ditë · {eur(p.price)}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Çmimi (€)"><input type="number" step="0.01" name="membershipPrice" value={form.membershipPrice} onChange={change} className={fieldCls} /></Field>
            </div>
            <Button type="submit" className={primaryBtn}>Krijo klientin</Button>
          </form>
        </Panel>
      )}

      <Panel
        title="Lista e klientëve"
        action={<input placeholder="Kërko emër ose email…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${fieldCls} w-56`} />}
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : clients.length === 0 ? (
          <EmptyState icon="👥" text="Ende s'ka klientë. Shto të parin me '+ Klient i ri'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Emri</th>
                  <th className="px-3 py-2 font-semibold">Pakoja</th>
                  <th className="px-3 py-2 font-semibold">Skadon</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetail(c.id)}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-3 py-3"><Badge accent="gray">{c.membershipType || '—'}</Badge></td>
                    <td className="px-3 py-3 text-gray-600">{shortDate(c.membershipExpiry)}</td>
                    <td className="px-3 py-3"><Badge accent={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Aktiv' : 'Pasiv'}</Badge></td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetail(c.id) }}>Detajet ›</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detail && (
        <Modal title={editing ? `Edito — ${detail.name}` : detail.name} onClose={() => setDetail(null)}>
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <Field label="Emri"><input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required className={fieldCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pakoja">
                  {plans.length === 0 ? (
                    <input value={editForm.membershipType} onChange={(e) => setEditForm((f) => ({ ...f, membershipType: e.target.value }))} className={fieldCls} />
                  ) : (
                    <select value={editForm.membershipType} onChange={(e) => selectEditPlan(e.target.value)} className={fieldCls}>
                      {!plans.some((p) => p.name === editForm.membershipType) && <option value={editForm.membershipType}>{editForm.membershipType || '—'}</option>}
                      {plans.map((p) => <option key={p.id} value={p.name}>{p.name} — {p.durationDays} ditë</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Statusi">
                  <select value={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value }))} className={fieldCls}>
                    <option value="true">Aktiv</option>
                    <option value="false">Pasiv</option>
                  </select>
                </Field>
              </div>
              <Field label="Skadon më"><input type="date" value={editForm.membershipExpiry} onChange={(e) => setEditForm((f) => ({ ...f, membershipExpiry: e.target.value }))} className={fieldCls} /></Field>
              <div className="flex gap-2">
                <Button type="submit" className={`flex-1 ${primaryBtn}`}>Ruaj</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Anulo</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{detail.email}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Pakoja</p><p className="font-medium text-gray-800">{detail.membershipType || '—'}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Skadon</p><p className="font-medium text-gray-800">{shortDate(detail.membershipExpiry)}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Statusi</p><Badge accent={detail.isActive ? 'green' : 'gray'}>{detail.isActive ? 'Aktiv' : 'Pasiv'}</Badge></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Trajneri</p><p className="font-medium text-gray-800">{detail.trainer || '—'}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Check-ins gjithsej</p><p className="font-medium text-gray-800">{detail.totalCheckIns}</p></div>
              </div>

              <div>
                <p className="mb-1 text-sm font-semibold text-gray-700">Qëllimet ({detail.goals.length})</p>
                {detail.goals.length === 0 ? (
                  <p className="text-sm text-gray-400">S'ka qëllime.</p>
                ) : (
                  <div className="space-y-1">
                    {detail.goals.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
                        <span className="text-gray-800">{g.title}</span>
                        <Badge accent={g.status === 'completed' ? 'green' : 'gray'}>{g.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Prezenca</p>
                  {!att && <button onClick={loadAttendance} className="text-sm font-medium text-gray-600 hover:underline">Ngarko →</button>}
                </div>
                {att && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400">{att.month} · {att.totalCheckIns} check-ins · {att.totalDays} ditë</p>
                    {att.attendance.slice(0, 6).map((r) => (
                      <div key={r.id} className="flex justify-between rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
                        <span className="text-gray-800">{shortDate(r.date)}</span>
                        <span className="text-gray-500">{hhmm(r.checkIn)} – {hhmm(r.checkOut)}{r.duration != null ? ` · ${Math.round(r.duration)} min` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <Button onClick={startEdit} className={primaryBtn}>Edito</Button>
                <Button onClick={checkIn} variant="outline">Check-In</Button>
                <Button onClick={del} variant="outline" className="text-gray-700">Fshij</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </DashboardShell>
  )
}

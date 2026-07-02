import { Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api, { getApiErrorMessage } from '../utils/api'
import { toDecimal } from '../utils/number'
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
  phone: string | null
  membershipType: string
  discountCategory: string
  planId: number | null
  membershipExpiry: string | null
  isActive: boolean
  trainerId: number | null
  trainer?: string | null
  startDate: string
  totalCheckIns: number
  goals: Goal[]
}
interface TrainerOption { id: number; name: string }
interface AttendanceRecord { id: number; date: string; checkIn: string | null; checkOut: string | null; duration: number | null }
interface AttendanceData { month: string; totalCheckIns: number; totalDays: number; attendance: AttendanceRecord[] }
interface Plan { id: number; name: string; price: number; durationDays: number; isActive: boolean }
interface Discount { id: number; key: string; name: string; discountPercent: number; isActive: boolean }

const empty = { name: '', email: '', password: '', membershipType: '', discountCategory: 'standard', membershipPrice: '0' }
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
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpPlanId, setTopUpPlanId] = useState<string>('')

  // detail / edit / attendance (inside one modal)
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    membershipType: '',
    discountCategory: 'standard',
    isActive: 'true',
    membershipExpiry: '',
    trainerId: '0',
  })
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [att, setAtt] = useState<AttendanceData | null>(null)

  useEffect(() => {
    api.get('/membershipplans?activeOnly=true').then((r) => {
      const list: Plan[] = Array.isArray(r.data) ? r.data : []
      setPlans(list)
      if (list[0]) setForm((f) => ({ ...f, membershipType: list[0].name, membershipPrice: String(list[0].price) }))
    }).catch(() => {})
    api.get('/discounts').then((r) => {
      setDiscounts(Array.isArray(r.data) ? r.data : [])
    }).catch(() => {})
    api.get('/trainers?pageSize=100').then((r) => {
      const list = Array.isArray(r.data?.trainers) ? r.data.trainers : []
      setTrainers(list.map((t: any) => ({ id: t.id, name: t.name })))
    }).catch(() => setTrainers([]))
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
    } catch (err) {
      setError(getApiErrorMessage(err, 'Ngarkimi i klientëve dështoi'))
    } finally {
      setLoading(false)
    }
  }

  const percentFor = (key: string) => discounts.find((d) => d.key === key && d.isActive)?.discountPercent ?? 0
  const applyDiscount = (price: number, key: string) => {
    const pct = percentFor(key)
    return Math.round(price * (1 - pct / 100) * 100) / 100
  }

  const selectCreatePlan = (name: string) => {
    const p = plans.find((x) => x.name === name)
    const base = p?.price ?? 0
    setForm((f) => ({ ...f, membershipType: name, membershipPrice: String(applyDiscount(base, f.discountCategory)) }))
  }
  const selectCreateDiscount = (key: string) => {
    const p = plans.find((x) => x.name === form.membershipType)
    const base = p?.price ?? 0
    setForm((f) => ({ ...f, discountCategory: key, membershipPrice: String(applyDiscount(base, key)) }))
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/clients/create', { ...form, membershipPrice: toDecimal(form.membershipPrice) })
      setShowForm(false)
      setForm({ ...empty, membershipType: plans[0]?.name ?? '', discountCategory: 'standard', membershipPrice: String(plans[0]?.price ?? 0) })
      addNotification('Sukses', 'Klienti u krijua.', 'success')
      fetchClients()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Krijimi i klientit dështoi'))
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
    } catch (err) {
      addNotification('Gabim', getApiErrorMessage(err, 'Ngarkimi i klientit dështoi.'), 'error')
    }
  }

  const startEdit = () => {
    if (!detail) return
    setEditForm({
      name: detail.name,
      email: detail.email,
      phone: detail.phone ?? '',
      newPassword: '',
      membershipType: detail.membershipType,
      discountCategory: detail.discountCategory || 'standard',
      isActive: String(detail.isActive),
      membershipExpiry: dateInput(detail.membershipExpiry),
      trainerId: detail.trainerId ? String(detail.trainerId) : '0',
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
        email: editForm.email,
        phone: editForm.phone,
        newPassword: editForm.newPassword || undefined,
        membershipType: editForm.membershipType,
        discountCategory: editForm.discountCategory,
        isActive: editForm.isActive === 'true',
        membershipExpiry: editForm.membershipExpiry ? new Date(editForm.membershipExpiry) : null,
        trainerId: parseInt(editForm.trainerId) || 0,
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

  const topUp = async () => {
    if (!detail) return
    const offerId = parseInt(topUpPlanId)
    if (!offerId) return
    try {
      const res = await api.post('/memberships/upgrade', { clientId: detail.id, offerId })
      addNotification('Sukses', res.data.message || 'Fatura u krijua.', 'success')
      setShowTopUp(false)
      openDetail(detail.id)
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Rinovimi dështoi.', 'error')
    }
  }

  const topUpPlan = plans.find((p) => String(p.id) === topUpPlanId)

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
              <Field label="Fjalëkalimi"><input type="password" name="password" value={form.password} onChange={change} required minLength={8} className={fieldCls} /></Field>
              <Field label="Pakoja e anëtarësimit">
                {plans.length === 0 ? (
                  <input name="membershipType" value={form.membershipType} onChange={change} placeholder="Krijo pako te 'Pakot'" className={fieldCls} />
                ) : (
                  <select value={form.membershipType} onChange={(e) => selectCreatePlan(e.target.value)} className={fieldCls}>
                    {plans.map((p) => <option key={p.id} value={p.name}>{p.name} — {p.durationDays} ditë · {eur(p.price)}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Kategoria e zbritjes">
                <select value={form.discountCategory} onChange={(e) => selectCreateDiscount(e.target.value)} className={fieldCls}>
                  {discounts.filter((d) => d.isActive).map((d) => <option key={d.id} value={d.key}>{d.name} ({d.discountPercent}%)</option>)}
                </select>
              </Field>
              <Field label="Çmimi për t'u faturuar (€)"><input type="text" inputMode="decimal" name="membershipPrice" value={form.membershipPrice} onChange={change} className={fieldCls} /></Field>
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
          <EmptyState icon={<Users className="h-5 w-5" />} text="Ende s'ka klientë. Shto të parin me '+ Klient i ri'." />
        ) : (
          <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => openDetail(c.id)}
                className="block w-full rounded-xl border border-gray-200 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="truncate text-xs text-gray-400">{c.email}</p>
                  </div>
                  <Badge accent={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Aktiv' : 'Pasiv'}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Badge accent="gray">{c.membershipType || '—'}</Badge>
                  <span className="text-gray-500">Skadon: {shortDate(c.membershipExpiry)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
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
          </>
        )}
      </Panel>

      {detail && showTopUp && (
        <Modal title={`Rinovo / Top-up — ${detail.name}`} onClose={() => setShowTopUp(false)}>
          <div className="space-y-4">
            <Field label="Pako">
              <select value={topUpPlanId} onChange={(e) => setTopUpPlanId(e.target.value)} className={fieldCls}>
                {plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationDays} ditë · {eur(p.price)}</option>)}
              </select>
            </Field>
            {topUpPlan && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs text-gray-400">Çmimi me zbritje</p>
                <p className="font-medium text-gray-800">{eur(applyDiscount(topUpPlan.price, detail.discountCategory))}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button className={`flex-1 ${primaryBtn}`} onClick={topUp}>Krijo faturë</Button>
              <Button variant="outline" onClick={() => setShowTopUp(false)}>Anulo</Button>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={editing ? `Edito — ${detail.name}` : detail.name} onClose={() => setDetail(null)}>
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Emri"><input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required className={fieldCls} /></Field>
                <Field label="Email"><input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required className={fieldCls} /></Field>
                <Field label="Telefoni"><input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="p.sh. 044 123 456" className={fieldCls} /></Field>
                <Field label="Trajneri">
                  <select value={editForm.trainerId} onChange={(e) => setEditForm((f) => ({ ...f, trainerId: e.target.value }))} className={fieldCls}>
                    <option value="0">Pa trajner</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
              </div>
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
                <Field label="Kategoria e zbritjes">
                  <select value={editForm.discountCategory} onChange={(e) => setEditForm((f) => ({ ...f, discountCategory: e.target.value }))} className={fieldCls}>
                    {!discounts.some((d) => d.isActive && d.key === editForm.discountCategory) && (
                      <option value={editForm.discountCategory}>{editForm.discountCategory} (joaktive)</option>
                    )}
                    {discounts.filter((d) => d.isActive).map((d) => <option key={d.id} value={d.key}>{d.name} ({d.discountPercent}%)</option>)}
                  </select>
                </Field>
                <Field label="Statusi">
                  <select value={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value }))} className={fieldCls}>
                    <option value="true">Aktiv</option>
                    <option value="false">Pasiv</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Skadon më"><input type="date" value={editForm.membershipExpiry} onChange={(e) => setEditForm((f) => ({ ...f, membershipExpiry: e.target.value }))} className={fieldCls} /></Field>
                <Field label="Fjalëkalim i ri (opsional)">
                  <input
                    type="text"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Lëre bosh për ta mbajtur"
                    minLength={8}
                    className={fieldCls}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className={`flex-1 ${primaryBtn}`}>Ruaj</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Anulo</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{detail.email}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Telefoni</p><p className="font-medium text-gray-800">{detail.phone || '—'}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Pakoja</p><p className="font-medium text-gray-800">{detail.membershipType || '—'}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-400">Zbritja</p><p className="font-medium text-gray-800">{discounts.find((d) => d.key === detail.discountCategory)?.name || detail.discountCategory || '—'}</p></div>
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
                <Button onClick={() => { setTopUpPlanId(String(detail.planId ?? plans[0]?.id ?? '')); setShowTopUp(true) }} variant="outline">Rinovo / Top-up</Button>
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

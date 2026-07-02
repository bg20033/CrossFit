import { Percent } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import PricingTabs from '../components/app/PricingTabs'
import api, { getApiErrorMessage } from '../utils/api'
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

interface Discount {
  id: number
  key: string
  name: string
  discountPercent: number
  isActive: boolean
  isBuiltIn: boolean
}

const empty = { key: '', name: '', discountPercent: '0', isActive: true }

export default function AdminDiscounts() {
  const { addNotification } = useNotification()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [edit, setEdit] = useState<Discount | null>(null)

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/discounts')
      setDiscounts(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Ngarkimi i zbritjeve dështoi'))
    } finally {
      setLoading(false)
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const changeEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEdit((p) => (p ? { ...p, [e.target.name]: e.target.value } : p))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/discounts', {
        key: form.key.trim(),
        name: form.name.trim(),
        discountPercent: parseInt(form.discountPercent, 10) || 0,
        isActive: form.isActive,
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Kategoria e zbritjes u krijua.', 'success')
      fetchDiscounts()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Krijimi dështoi.', 'error')
    }
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    try {
      await api.put(`/discounts/${edit.id}`, {
        key: edit.key.trim(),
        name: edit.name.trim(),
        discountPercent: parseInt(String(edit.discountPercent), 10) || 0,
        isActive: edit.isActive,
      })
      setEdit(null)
      addNotification('Sukses', 'Kategoria u përditësua.', 'success')
      fetchDiscounts()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Përditësimi dështoi.', 'error')
    }
  }

  const toggleActive = async (d: Discount) => {
    try {
      await api.put(`/discounts/${d.id}`, {
        key: d.key,
        name: d.name,
        discountPercent: d.discountPercent,
        isActive: !d.isActive,
      })
      fetchDiscounts()
    } catch {
      addNotification('Gabim', 'Veprimi dështoi.', 'error')
    }
  }

  const remove = async (d: Discount) => {
    if (d.isBuiltIn) {
      addNotification('Info', 'Kategoritë e sistemit nuk mund të fshihen — çaktivizoji në vend të kësaj.', 'info')
      return
    }
    if (!confirm(`Fshij kategorinë "${d.name}"?`)) return
    try {
      await api.delete(`/discounts/${d.id}`)
      addNotification('Fshirë', 'Kategoria u fshi.', 'success')
      fetchDiscounts()
    } catch {
      addNotification('Gabim', 'Fshirja dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Zbritjet"
        subtitle="Kategoritë e zbritjes me përqindje (policë, studentë, etj.)."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Kategori e re'}
          </Button>
        }
      />

      <PricingTabs />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Krijo kategori zbritjeje">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Celesi (pa hapsira)">
                <input name="key" value={form.key} onChange={change} required pattern="[a-z0-9_]+" placeholder="p.sh. student" className={fieldCls} />
              </Field>
              <Field label="Emri">
                <input name="name" value={form.name} onChange={change} required placeholder="p.sh. Student" className={fieldCls} />
              </Field>
              <Field label="Zbritja (%)">
                <input type="number" min={0} max={100} step="1" name="discountPercent" value={form.discountPercent} onChange={change} required className={fieldCls} />
              </Field>
            </div>
            <Field label="Aktive">
              <select name="isActive" value={String(form.isActive)} onChange={change} className={fieldCls}>
                <option value="true">Po</option>
                <option value="false">Jo</option>
              </select>
            </Field>
            <Button type="submit" className={primaryBtn}>Krijo</Button>
          </form>
        </Panel>
      )}

      <Panel title="Kategoritë" action={<Badge accent="gray">{discounts.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : discounts.length === 0 ? (
          <EmptyState icon={<Percent className="h-5 w-5" />} text="Ende s'ka kategori zbritjeje. Shto të parën." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {discounts.map((d) => (
              <div key={d.id} className="flex flex-col rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{d.name}</h3>
                  <Badge accent={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'Aktive' : 'Joaktive'}</Badge>
                </div>
                <p className="mt-1 text-3xl font-bold text-gray-900">{d.discountPercent}%</p>
                <p className="text-sm text-gray-500">Çelësi: {d.key}{d.isBuiltIn ? ' · e sistemit' : ''}</p>
                <div className="mt-4 flex flex-wrap gap-2 pt-2">
                  <Button size="sm" className={primaryBtn} onClick={() => setEdit(d)}>Edito</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(d)}>{d.isActive ? 'Çaktivizo' : 'Aktivizo'}</Button>
                  {!d.isBuiltIn && <Button size="sm" variant="outline" onClick={() => remove(d)}>Fshij</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {edit && (
        <Modal title={`Edito — ${edit.name}`} onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label={edit.isBuiltIn ? 'Çelësi (i sistemit — i palëvizshëm)' : 'Çelësi'}>
              <input
                name="key"
                value={edit.key}
                onChange={changeEdit}
                required
                pattern="[a-z0-9_]+"
                disabled={edit.isBuiltIn}
                className={`${fieldCls} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
              />
              {!edit.isBuiltIn && (
                <p className="mt-1 text-xs text-gray-500">Nëse e ndryshon, klientët me çelësin e vjetër kalojnë automatikisht te i riu.</p>
              )}
            </Field>
            <Field label="Emri">
              <input name="name" value={edit.name} onChange={changeEdit} required className={fieldCls} />
            </Field>
            <Field label="Zbritja (%)">
              <input type="number" min={0} max={100} step="1" name="discountPercent" value={edit.discountPercent} onChange={changeEdit} required className={fieldCls} />
            </Field>
            <Field label="Aktive">
              <select name="isActive" value={String(edit.isActive)} onChange={(e) => setEdit((p) => (p ? { ...p, isActive: e.target.value === 'true' } : p))} className={fieldCls}>
                <option value="true">Po</option>
                <option value="false">Jo</option>
              </select>
            </Field>
            <Button type="submit" className={`w-full ${primaryBtn}`}>Ruaj ndryshimet</Button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}

import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, DashboardHeader, DashboardShell, EmptyState, Panel, Skeleton } from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'

const empty = { name: '', phone: '', goal: '', sessionsLeft: '10' }

interface TenantClientRow {
  id: number
  name: string
  phone: string
  goal: string
  notes: string
  isActive: boolean
  createdAt: string
}

function sessionsLabel(notes: string) {
  const match = notes?.match(/\d+/)
  return match ? `${match[0]} seanca` : notes || 'aktiv'
}

export default function TenantClients() {
  const { addNotification } = useNotification()
  const [clients, setClients] = useState<TenantClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/rentals/tenant/clients')
      setClients(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Klientët e tenant-it nuk u ngarkuan. Kontrollo rolin/profilin e qirasë.')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const inputCls =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      goal: form.goal.trim() || '-',
      notes: `${Number(form.sessionsLeft) || 0} seanca të mbetura`,
    }

    try {
      const res = await api.post('/rentals/tenant/clients', payload)
      setClients((rows) => [{ id: res.data.id, ...payload, createdAt: new Date().toISOString(), isActive: true }, ...rows])
      setForm(empty)
      setOpen(false)
      addNotification('Sukses', 'Klienti u ruajt në DB.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ruajtja e klientit dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Privat"
        title="Klientët e mi"
        subtitle="Lista jote private nga DB, e izoluar për tenant-in tënd."
        right={<Button className="bg-coral-500 text-white hover:bg-coral-600" onClick={() => setOpen((v) => !v)}>+ Klient i ri</Button>}
      />

      {open && (
        <Panel title="Shto klient">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <input className={inputCls} placeholder="Emri i plotë" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="Telefoni" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={inputCls} placeholder="Qëllimi" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            <input className={inputCls} type="number" placeholder="Seanca të mbetura" value={form.sessionsLeft} onChange={(e) => setForm({ ...form, sessionsLeft: e.target.value })} />
            <div className="md:col-span-2">
              <Button type="submit" className="bg-coral-500 text-white hover:bg-coral-600">Ruaj klientin</Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`${clients.length} klientë`}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text={error} />
        ) : clients.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text="Ende pa klientë. Shto të parin." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-medium">Emri</th>
                  <th className="pb-2 font-medium">Telefoni</th>
                  <th className="pb-2 font-medium">Qëllimi</th>
                  <th className="pb-2 font-medium">Seanca</th>
                  <th className="pb-2 font-medium">Anëtar që</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 text-gray-500">{c.phone || '-'}</td>
                    <td className="py-3 text-gray-500">{c.goal || '-'}</td>
                    <td className="py-3">
                      <Badge accent={sessionsLabel(c.notes).startsWith('0') ? 'gray' : 'green'}>{sessionsLabel(c.notes)}</Badge>
                    </td>
                    <td className="nums py-3 text-gray-400">{String(c.createdAt ?? '').slice(0, 10)}</td>
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

import { useState, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  fieldCls,
  EmptyState,
  Badge,
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

const STATUSES = [
  { key: 'new', label: 'Të reja' },
  { key: 'contacted', label: 'Kontaktuar' },
  { key: 'approved', label: 'Aprovuar' },
  { key: 'rejected', label: 'Refuzuar' },
]
const statusLabel: Record<string, string> = { new: 'I ri', contacted: 'Kontaktuar', approved: 'Aprovuar', rejected: 'Refuzuar' }

export default function AdminRentals() {
  const { addNotification } = useNotification()
  const [items, setItems] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchItems()
  }, [filter])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/rentals${filter ? `?status=${filter}` : ''}`)
      setItems(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
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

  const newCount = items.filter((i) => i.status === 'new').length

  return (
    <DashboardShell>
      <DashboardHeader badge="Qira" title="Qiragjinjtë" subtitle="Kërkesat për qira të hapësirës së palestrës." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="📨" label="Gjithsej kërkesa" value={loading ? '…' : items.length} />
        <StatCard icon="🆕" label="Të reja" value={loading ? '…' : newCount} />
        <StatCard icon="✅" label="Aprovuar" value={loading ? '…' : items.filter((i) => i.status === 'approved').length} />
      </div>

      <Panel
        title="Kërkesat"
        action={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button onClick={() => setFilter('')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Të gjitha</button>
            {STATUSES.map((s) => (
              <button key={s.key} onClick={() => setFilter(s.key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === s.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : items.length === 0 ? (
          <EmptyState icon="🏟️" text="S'ka kërkesa për qira. Vijnë nga forma publike te /rental." />
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
    </DashboardShell>
  )
}

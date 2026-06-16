import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { eur } from '../utils/format'
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

interface Trainer {
  id: number
  name: string
  email: string
  specialization: string
  hourlyRate: number
  isAvailable: boolean
  clientsCount?: number
}

const empty = { name: '', email: '', password: '', specialization: '', bio: '', hourlyRate: '0' }

export default function AdminTrainers() {
  const { addNotification } = useNotification()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)

  useEffect(() => {
    fetchTrainers()
  }, [])

  const fetchTrainers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/trainers')
      setTrainers(res.data.trainers ?? [])
    } catch {
      setError('Ngarkimi i trajnerëve dështoi')
    } finally {
      setLoading(false)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/trainers/create', { ...form, hourlyRate: parseFloat(form.hourlyRate) })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Trajneri u krijua.', 'success')
      fetchTrainers()
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Krijimi i trajnerit dështoi')
    }
  }

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Menaxhim"
        title="Trajnerët"
        subtitle="Stafi i trajnimit, specializimet dhe disponueshmëria."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? 'Mbyll' : '+ Trajner i ri'}
          </Button>
        }
      />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {showForm && (
        <Panel title="Shto trajner të ri">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri"><input name="name" value={form.name} onChange={change} required className={fieldCls} /></Field>
              <Field label="Email"><input type="email" name="email" value={form.email} onChange={change} required className={fieldCls} /></Field>
              <Field label="Fjalëkalimi"><input type="password" name="password" value={form.password} onChange={change} required className={fieldCls} /></Field>
              <Field label="Specializimi"><input name="specialization" value={form.specialization} onChange={change} placeholder="p.sh. CrossFit, Forcë" className={fieldCls} /></Field>
              <Field label="Tarifa/orë (€)"><input type="number" step="0.01" name="hourlyRate" value={form.hourlyRate} onChange={change} className={fieldCls} /></Field>
            </div>
            <Field label="Bio"><input name="bio" value={form.bio} onChange={change} className={fieldCls} /></Field>
            <Button type="submit" className={primaryBtn}>Krijo</Button>
          </form>
        </Panel>
      )}

      <Panel title="Lista e trajnerëve" action={<Badge accent="gray">{trainers.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : trainers.length === 0 ? (
          <EmptyState icon="🏋️" text="Ende s'ka trajnerë. Shto të parin me '+ Trajner i ri'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Emri</th>
                  <th className="px-3 py-2 font-semibold">Specializimi</th>
                  <th className="px-3 py-2 font-semibold">Tarifa/orë</th>
                  <th className="px-3 py-2 font-semibold">Klientë</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trainers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{t.specialization || '—'}</td>
                    <td className="px-3 py-3 text-gray-800">{eur(t.hourlyRate)}</td>
                    <td className="px-3 py-3 text-gray-600">{t.clientsCount ?? 0}</td>
                    <td className="px-3 py-3"><Badge accent={t.isAvailable ? 'green' : 'gray'}>{t.isAvailable ? 'I lirë' : 'I zënë'}</Badge></td>
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

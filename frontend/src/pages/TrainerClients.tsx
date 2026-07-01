import { CalendarDays, ClipboardList, Dumbbell, Target, Users } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  StatCard,
  EmptyState,
  Badge,
  Modal,
  Field,
  fieldCls,
  primaryBtn,
  ListSkeleton,
  RingChart,
} from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import ProgressPhotos from '../components/ProgressPhotos'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Measurement {
  weight: number
  chest: number
  waist: number
  hips: number
  arms: number
  bodyFat: number
  updatedAt: string
}

interface AttendanceRecord {
  id: number
  date: string
  present: boolean
  groupName: string
}

interface Plan {
  id: number
  title: string
  type: 'workout' | 'diet'
  createdAt: string
  status: 'active' | 'completed' | 'draft'
}

interface ClientDetail {
  id: number
  name: string
  phone: string
  email: string
  activePackage: string
  groupName: string
  lastCheckIn: string
  goals: string
  injuries: string
  notes: string
  measurements: Measurement
  attendance: AttendanceRecord[]
  plans: Plan[]
}

const TABS = ['Trupi', 'Të dhëna', 'Prezenca', 'Plane'] as const
type Tab = (typeof TABS)[number]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function attendanceRate(attendance: AttendanceRecord[]): number {
  if (!attendance.length) return 0
  const present = attendance.filter((a) => a.present).length
  return Math.round((present / attendance.length) * 100)
}

function noShowCount(attendance: AttendanceRecord[]): number {
  return attendance.filter((a) => !a.present).length
}

function fmtDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sq-AL')
}

function planBadgeAccent(status: Plan['status']): 'green' | 'gray' | 'orange' {
  if (status === 'active') return 'green'
  if (status === 'completed') return 'gray'
  return 'orange'
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TrainerClients() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()

  const [clients, setClients] = useState<ClientDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ClientDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Trupi')

  // Fetch clients from the trainer profile endpoint.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        if (!profileId) return
        const res = await api.get(`/trainers/${profileId}/clients`)
        const data = Array.isArray(res.data) ? res.data : []
        if (!cancelled) setClients(data)
      } catch {
        if (!cancelled) {
          setClients([])
          addNotification('Gabim', 'Klientët e trajnerit nuk u ngarkuan.', 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.groupName.toLowerCase().includes(q) ||
        c.activePackage.toLowerCase().includes(q)
    )
  }, [clients, search])

  const totalClients = clients.length
  const avgAttendance = useMemo(() => {
    if (!clients.length) return 0
    const total = clients.reduce((s, c) => s + attendanceRate(c.attendance), 0)
    return Math.round(total / clients.length)
  }, [clients])

  const activePlans = useMemo(
    () => clients.reduce((s, c) => s + c.plans.filter((p) => p.status === 'active').length, 0),
    [clients]
  )

  const openDetail = (client: ClientDetail) => {
    setSelected(client)
    setActiveTab('Trupi')
  }

  const closeDetail = () => setSelected(null)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Trajner"
        title="Klientët e mi"
        subtitle="Menaxho klientët, matjet, prezencën dhe planet e stërvitjes."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} accent="blue" label="Klientë gjithsej" value={loading ? '…' : totalClients} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} accent="green" label="Prezenca mesatare" value={loading ? '…' : `${avgAttendance}%`} />
        <StatCard icon={<Dumbbell className="h-5 w-5" />} accent="purple" label="Plane aktive" value={loading ? '…' : activePlans} />
        <StatCard icon={<Target className="h-5 w-5" />} accent="orange" label="Grupet" value={loading ? '…' : new Set(clients.map((c) => c.groupName).filter(Boolean)).size} />
      </div>

      {/* Client list */}
      <Panel
        title="Lista e Klientëve"
        action={
          <div className="flex items-center gap-2">
            <Badge>{filtered.length}</Badge>
          </div>
        }
      >
        {/* Search */}
        <div className="mb-4">
          <Field label="Kërko">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Emri, email, telefoni, pakoja…"
              className={fieldCls}
            />
          </Field>
        </div>

        {loading ? (
          <ListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} text="Nuk u gjet asnjë klient për kriterin e kërkimit." />
        ) : (
          <>
          {/* Mobile: cards (the 7-column table is unreadable on phones) */}
          <div className="space-y-3 md:hidden">
            {filtered.map((client) => (
              <div key={client.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="truncate text-xs text-gray-400">{client.email}</p>
                  </div>
                  <Badge accent="green">{client.activePackage}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-gray-400">Tel</dt><dd className="truncate text-gray-700">{client.phone || '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-gray-400">Grupi</dt><dd className="truncate text-gray-700">{client.groupName || '—'}</dd></div>
                  <div className="col-span-2 flex justify-between gap-2"><dt className="text-gray-400">Hyrja e fundit</dt><dd className="text-gray-700">{fmtDate(client.lastCheckIn)}</dd></div>
                </dl>
                <Button size="sm" className={`${primaryBtn} mt-3 w-full`} onClick={() => openDetail(client)}>Shiko detajet</Button>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Klienti</th>
                  <th className="px-3 py-2 font-semibold">Telefoni</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Pakoja</th>
                  <th className="px-3 py-2 font-semibold">Grupi</th>
                  <th className="px-3 py-2 font-semibold">Hyrja e fundit</th>
                  <th className="px-3 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{client.name}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{client.phone}</td>
                    <td className="px-3 py-3 text-gray-600">{client.email}</td>
                    <td className="px-3 py-3">
                      <Badge accent="green">{client.activePackage}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{client.groupName}</td>
                    <td className="px-3 py-3 text-gray-600">{fmtDate(client.lastCheckIn)}</td>
                    <td className="px-3 py-3">
                      <Button size="sm" className={primaryBtn} onClick={() => openDetail(client)}>
                        Shiko detajet
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panel>

      {/* Detail modal */}
      {selected && (
        <Modal title={selected.name} onClose={closeDetail}>
          {/* Tabs */}
          <div className="mb-4 flex gap-1 border-b border-gray-100 pb-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-coral-50 text-coral-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab: Trupi */}
          {activeTab === 'Trupi' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="Pesha (kg)" value={selected.measurements.weight} />
                <Metric label="Gjoksi (cm)" value={selected.measurements.chest} />
                <Metric label="Beli (cm)" value={selected.measurements.waist} />
                <Metric label="Ijet (cm)" value={selected.measurements.hips} />
                <Metric label="Krahët (cm)" value={selected.measurements.arms} />
                <Metric label="Yndyra trupore (%)" value={selected.measurements.bodyFat} />
              </div>
              <p className="text-xs text-gray-400">Përditësimi i fundit: {fmtDate(selected.measurements.updatedAt)}</p>

              {/* Progress photos */}
              <ProgressPhotos clientId={selected.id} />
            </div>
          )}

          {/* Tab: Të dhëna */}
          {activeTab === 'Të dhëna' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Emri i plotë">
                  <div className={fieldCls}>{selected.name}</div>
                </Field>
                <Field label="Email">
                  <div className={fieldCls}>{selected.email}</div>
                </Field>
                <Field label="Telefoni">
                  <div className={fieldCls}>{selected.phone}</div>
                </Field>
                <Field label="Pakoja aktive">
                  <div className={fieldCls}>{selected.activePackage}</div>
                </Field>
                <Field label="Grupi">
                  <div className={fieldCls}>{selected.groupName}</div>
                </Field>
              </div>
              <Field label="Qëllimet">
                <div className={`${fieldCls} min-h-[3rem]`}>{selected.goals || '—'}</div>
              </Field>
              <Field label="Lëndimet">
                <div className={`${fieldCls} min-h-[3rem]`}>{selected.injuries || '—'}</div>
              </Field>
              <Field label="Shënime">
                <div className={`${fieldCls} min-h-[3rem]`}>{selected.notes || '—'}</div>
              </Field>
            </div>
          )}

          {/* Tab: Prezenca */}
          {activeTab === 'Prezenca' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="flex flex-col items-center">
                  <RingChart value={attendanceRate(selected.attendance)} label="Prezenca" sub="e seancave të fundit" size={120} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:flex-1">
                  <StatMini label="Seanca gjithsej" value={selected.attendance.length} />
                  <StatMini label="Prezenca" value={selected.attendance.filter((a) => a.present).length} />
                  <StatMini label="Mungesa" value={noShowCount(selected.attendance)} />
                  <StatMini label="Grupi" value={selected.groupName} />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 font-semibold">Grupi</th>
                      <th className="px-3 py-2 font-semibold">Statusi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.attendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-400">
                          Nuk ka regjistrime prezence.
                        </td>
                      </tr>
                    ) : (
                      selected.attendance.map((a) => (
                        <tr key={a.id}>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(a.date)}</td>
                          <td className="px-3 py-2 text-gray-600">{a.groupName}</td>
                          <td className="px-3 py-2">
                            {a.present ? (
                              <Badge accent="green">Prezent</Badge>
                            ) : (
                              <Badge accent="gray">Mungesë</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Plane */}
          {activeTab === 'Plane' && (
            <div className="space-y-3">
              {selected.plans.length === 0 ? (
                <EmptyState icon={<ClipboardList className="h-5 w-5" />} text="Nuk ka plane të caktuara për këtë klient." />
              ) : (
                selected.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{plan.title}</p>
                        <Badge accent={planBadgeAccent(plan.status)}>
                          {plan.status === 'active' ? 'Aktiv' : plan.status === 'completed' ? 'Përfunduar' : 'Draft'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {plan.type === 'workout' ? 'Plan ushtrimesh' : 'Plan diete'} • Krijuar më {fmtDate(plan.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addNotification('Info', 'Hapja e detajeve të planit do të shtohet së shpejti.', 'info')}
                    >
                      Hap planin
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </Modal>
      )}
    </DashboardShell>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="nums mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="nums mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

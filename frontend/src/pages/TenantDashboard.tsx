import { Banknote, BarChart3, CalendarDays, Plus, Receipt, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader, DashboardShell, EmptyState, Panel, QuickAction, StatCard } from '../components/DashboardKit'
import { fmtMin } from '../features/access/accessEngine'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

interface TenantClientRow {
  id: number
  isActive: boolean
}

interface ScheduleSlot {
  dayOfWeek: string
  startMin: number
  endMin: number
}

interface RentalInvoice {
  id: number
  amount: number
  status: string
}

const AVG_REVENUE_PER_CLIENT = 120

export default function TenantDashboard() {
  const { profileId } = useAuth()
  const [clients, setClients] = useState<TenantClientRow[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [invoices, setInvoices] = useState<RentalInvoice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/rentals/tenant/clients?tenantId=${profileId}`),
      api.get('/rentals/tenant/schedule'),
      api.get(`/rentals/tenant/invoices?tenantId=${profileId}`),
    ])
      .then(([clientsRes, scheduleRes, invoicesRes]) => {
        setClients(Array.isArray(clientsRes.data) ? clientsRes.data : [])
        setSlots(Array.isArray(scheduleRes.data?.slots ?? scheduleRes.data?.Slots) ? (scheduleRes.data.slots ?? scheduleRes.data.Slots) : [])
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : [])
        setError('')
      })
      .catch((err) => {
        setClients([])
        setSlots([])
        setInvoices([])
        setError(err.response?.data?.message || 'Të dhënat e qiragjisë nuk u ngarkuan nga DB.')
      })
  }, [])

  const activeClients = clients.filter((c) => c.isActive !== false).length
  const income = activeClients * AVG_REVENUE_PER_CLIENT
  const rentalCost = useMemo(
    () => invoices.filter((i) => i.status !== 'paid').reduce((a, i) => a + Number(i.amount), 0),
    [invoices]
  )
  const profit = income - rentalCost

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Qiragji"
        title="Hapësira ime"
        subtitle="Micro-gym brenda sallës, me klientë, orar javor dhe fatura nga DB."
      />

      {error && <EmptyState icon={<BarChart3 className="h-5 w-5" />} text={error} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Klientët e mi" value={activeClients} sub="aktivë" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Seanca/javë" value={slots.length} sub="në orarin tim" />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Të ardhura (mu.)" value={`€${income}`} sub="nga klientët" />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Fitimi neto" value={`€${profit}`} sub={`pas qirasë €${rentalCost}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Orari im javor" className="lg:col-span-2">
          {slots.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="S'ke orar të konfiguruar ende. Shko te Orari për ta konfiguru (emri, koha, sa herë në javë)." />
          ) : (
            <div className="space-y-1.5">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 font-mono text-xs font-bold text-white">
                      {s.dayOfWeek.slice(0, 3)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{fmtMin(s.startMin)}–{fmtMin(s.endMin)}</p>
                      <p className="text-xs text-gray-400">{s.endMin - s.startMin} min</p>
                    </div>
                  </div>
                  <Link to="/tenant/schedule" className="text-xs font-semibold text-coral-600 hover:underline">
                    Konfiguro
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Veprime të shpejta">
          <div className="space-y-3">
            <QuickAction to="/tenant/clients" icon={<Plus className="h-5 w-5" />} label="Shto klient" />
            <QuickAction to="/tenant/schedule" icon={<CalendarDays className="h-5 w-5" />} label="Konfiguro orarin" />
            <QuickAction to="/tenant/billing" icon={<Receipt className="h-5 w-5" />} label="Qiraja & faturat" />
          </div>
        </Panel>
      </div>
    </DashboardShell>
  )
}

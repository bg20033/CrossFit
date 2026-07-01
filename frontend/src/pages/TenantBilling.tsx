import { CalendarDays, CheckCircle, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, DashboardHeader, DashboardShell, EmptyState, Panel, Skeleton, StatCard } from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'

interface RentalInvoice {
  id: number
  invoiceNumber: string
  amount: number
  periodStart: string
  periodEnd: string
  dueDate: string
  status: string
  paidAt: string | null
}

interface ScheduleSlot {
  dayOfWeek: string
  startMin: number
  endMin: number
}

export default function TenantBilling() {
  const { addNotification } = useNotification()
  const [invoices, setInvoices] = useState<RentalInvoice[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [invoiceRes, scheduleRes] = await Promise.all([
        api.get('/rentals/tenant/invoices'),
        api.get('/rentals/tenant/schedule'),
      ])
      setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : [])
      setSlots(Array.isArray(scheduleRes.data?.slots) ? scheduleRes.data.slots : [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Faturat e qirasë nuk u ngarkuan nga DB.')
      setInvoices([])
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const due = invoices.filter((i) => i.status !== 'paid').reduce((a, i) => a + Number(i.amount), 0)
  const paid = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + Number(i.amount), 0)
  const bookedSlots = slots.length

  const payInvoice = async (id: number) => {
    try {
      await api.post(`/rentals/tenant/invoices/${id}/pay`)
      setInvoices((rows) => rows.map((i) => i.id === id ? { ...i, status: 'paid', paidAt: new Date().toISOString() } : i))
      addNotification('Sukses', 'Fatura u shënua e paguar.', 'success')
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Pagesa dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Kontrata"
        title="Qiraja & Faturat"
        subtitle="Detajet e kontratës dhe faturat mujore nga DB."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Për t'u paguar" value={`€${due}`} sub="fatura të hapura" />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Paguar" value={`€${paid}`} sub="këtë periudhë" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Termine/javë" value={bookedSlots} sub="të rezervuara" />
      </div>

      <Panel title="Kontrata e qirasë">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tarifa', invoices.length ? `€${Math.round(due + paid)} total` : '-'],
            ['Periudha', 'Mujore'],
            ['Terminet/javë', String(bookedSlots)],
            ['Statusi', error ? 'Pa lidhje' : 'Aktive'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-100 p-4">
              <p className="label-mono">{k}</p>
              <p className="mt-1 font-display text-lg font-bold text-gray-900">{v}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Faturat">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <EmptyState icon={<Receipt className="h-5 w-5" />} text={error} />
        ) : invoices.length === 0 ? (
          <EmptyState icon={<Receipt className="h-5 w-5" />} text="S'ka fatura qiraje në DB." />
        ) : (
          <div className="space-y-2">
            {invoices.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{iv.invoiceNumber}</p>
                  <p className="nums text-xs text-gray-400">Afati: {String(iv.dueDate).slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="nums font-display text-lg font-bold text-gray-900">€{iv.amount}</span>
                  {iv.status === 'paid' ? (
                    <Badge accent="green">Paguar</Badge>
                  ) : (
                    <Button size="sm" className="bg-coral-500 text-white hover:bg-coral-600" onClick={() => payInvoice(iv.id)}>
                      Paguaj
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

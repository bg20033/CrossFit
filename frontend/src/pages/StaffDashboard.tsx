import { Banknote, CheckCircle, Plus, Receipt, Users, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  QuickAction,
  EmptyState,
  Badge,
} from '../components/DashboardKit'

interface PendingInvoice {
  id: number
  invoiceNumber: string
  client: string
  totalAmount: number
  daysOverdue: number
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [openingBalance, setOpeningBalance] = useState<number | null>(null)
  const [clients, setClients] = useState(0)
  const [pending, setPending] = useState<PendingInvoice[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const results = await Promise.allSettled([
        api.get('/cashregister/current'),
        api.get('/clients?page=1&pageSize=1'),
        api.get('/invoice/pending'),
      ])
      if (!active) return
      const val = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.data : null)
      const reg = val(0)
      const isOpen = !!reg && !reg.message
      setRegisterOpen(isOpen)
      setOpeningBalance(isOpen ? reg.openingBalance ?? 0 : null)
      setClients(val(1)?.total ?? 0)
      setPending(Array.isArray(val(2)) ? val(2) : [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const pendingTotal = pending.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Recepsion"
        title={`Mirë se erdhe, ${user?.name?.split(' ')[0] || 'Staf'}`}
        subtitle="Arka, regjistrimet dhe faturat e ditës."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Banknote className="h-5 w-5" />}
          accent={registerOpen ? 'green' : 'gray'}
          label="Arka"
          value={loading ? '…' : registerOpen ? 'Hapur' : 'Mbyllur'}
          sub={registerOpen && openingBalance !== null ? `Hapur me ${eur(openingBalance)}` : undefined}
        />
        <StatCard icon={<Users className="h-5 w-5" />} accent="blue" label="Klientë" value={loading ? '…' : clients} />
        <StatCard icon={<Receipt className="h-5 w-5" />} accent="orange" label="Fatura pending" value={loading ? '…' : pending.length} />
        <StatCard icon={<Banknote className="h-5 w-5" />} accent="red" label="Borxh total" value={loading ? '…' : eur(pendingTotal)} />
      </div>

      <Panel title="Aksione të shpejta">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/register" icon={<Plus className="h-5 w-5" />} label="Regjistro klient" accent="green" />
          <QuickAction to="/admin/cash-register" icon={<Banknote className="h-5 w-5" />} label="Arka" accent="orange" />
          <QuickAction to="/admin/clients" icon={<Users className="h-5 w-5" />} label="Klientët" accent="blue" />
          <QuickAction to="/admin/finance" icon={<Wallet className="h-5 w-5" />} label="Pagesat" accent="teal" />
        </div>
      </Panel>

      <Panel title="Fatura të papaguara" action={<Badge accent="orange">{pending.length}</Badge>}>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : pending.length === 0 ? (
          <EmptyState icon={<CheckCircle className="h-5 w-5" />} text="S'ka fatura të papaguara." />
        ) : (
          <div className="space-y-3">
            {pending.slice(0, 8).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.client}</p>
                  <p className="text-xs text-gray-400">{inv.invoiceNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">{eur(inv.totalAmount)}</span>
                  {inv.daysOverdue > 0 && <Badge accent="red">{inv.daysOverdue}d</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

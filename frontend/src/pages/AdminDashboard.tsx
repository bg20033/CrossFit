import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { eur, shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  QuickAction,
  EmptyState,
  Badge,
  BarList,
} from '../components/DashboardKit'

const WD_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WD_AL: Record<string, string> = {
  Monday: 'E Hënë', Tuesday: 'E Martë', Wednesday: 'E Mërkurë', Thursday: 'E Enjte',
  Friday: 'E Premte', Saturday: 'E Shtunë', Sunday: 'E Diel',
}

interface Summary {
  totalIncome: number
  totalExpenses: number
  balance: number
}
interface Tx {
  id: number
  type: string
  amount: number
  description?: string
  transactionDate?: string
  category?: string
}
interface PendingInvoice {
  id: number
  invoiceNumber: string
  client: string
  totalAmount: number
  daysOverdue: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, balance: 0 })
  const [counts, setCounts] = useState({ clients: 0, staff: 0, trainers: 0, groups: 0 })
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [pending, setPending] = useState<PendingInvoice[]>([])
  const [monthly, setMonthly] = useState<{ label: string; income: number; expense: number }[]>([])
  const [weekday, setWeekday] = useState<Record<string, number>>({})

  useEffect(() => {
    api.get('/attendance/overview').then((r) => setWeekday(r.data?.byWeekday ?? {})).catch(() => {})
  }, [])

  useEffect(() => {
    const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
    Promise.allSettled(months.map((m) => api.get(`/finance/monthly-report?year=${m.year}&month=${m.month}`))).then((res) => {
      setMonthly(
        res.map((r, i) => {
          const d = r.status === 'fulfilled' ? (r as PromiseFulfilledResult<any>).value.data : null
          return { label: MONTHS[months[i].month - 1], income: d?.income?.total ?? 0, expense: d?.expenses?.total ?? 0 }
        })
      )
    })
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      const results = await Promise.allSettled([
        api.get('/finance/summary'),
        api.get('/clients?page=1&pageSize=1'),
        api.get('/staff?page=1&pageSize=1'),
        api.get('/trainers?page=1&pageSize=1'),
        api.get('/traininggroups'),
        api.get('/finance/transactions?page=1&pageSize=6'),
        api.get('/invoice/pending'),
      ])
      if (!active) return
      const val = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value.data : null)
      if (val(0)) setSummary(val(0))
      setCounts({
        clients: val(1)?.total ?? 0,
        staff: val(2)?.total ?? 0,
        trainers: val(3)?.total ?? 0,
        groups: Array.isArray(val(4)) ? val(4).length : 0,
      })
      setTransactions(val(5)?.transactions ?? [])
      setPending(Array.isArray(val(6)) ? val(6) : [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Admin Panel"
        title={`Mirë se erdhe, ${user?.name?.split(' ')[0] || 'Admin'} 👋`}
        subtitle="Pamje e përgjithshme e palestrës, financave dhe operacioneve."
      />

      {/* Finance row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="↗" accent="green" label="Të hyrat (30 ditë)" value={loading ? '…' : eur(summary.totalIncome)} />
        <StatCard icon="↘" accent="red" label="Shpenzimet (30 ditë)" value={loading ? '…' : eur(summary.totalExpenses)} />
        <StatCard
          icon="∑"
          accent={summary.balance >= 0 ? 'blue' : 'red'}
          label="Bilanci"
          value={loading ? '…' : eur(summary.balance)}
          sub={summary.balance >= 0 ? 'Pozitiv' : 'Negativ'}
        />
      </div>

      {/* Counts row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="👥" accent="blue" label="Klientë" value={loading ? '…' : counts.clients} />
        <StatCard icon="🏋️" accent="purple" label="Trajnerë" value={loading ? '…' : counts.trainers} />
        <StatCard icon="👔" accent="teal" label="Staf" value={loading ? '…' : counts.staff} />
        <StatCard icon="📅" accent="orange" label="Grupe aktive" value={loading ? '…' : counts.groups} />
      </div>

      {/* Finance chart */}
      <Panel
        title="Hyrje vs Dalje (6 muajt e fundit)"
        action={
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-900" /> Hyrje</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Dalje</span>
          </div>
        }
      >
        {(() => {
          const max = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense]))
          const hasData = monthly.some((m) => m.income > 0 || m.expense > 0)
          if (!hasData) return <EmptyState icon="📊" text="Ende s'ka të dhëna financiare për grafikun." />
          return (
            <div className="flex items-end justify-between gap-3 pt-2" style={{ height: 200 }}>
              {monthly.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="w-1/2 rounded-t bg-gray-900" style={{ height: `${(m.income / max) * 100}%` }} title={`Hyrje: ${eur(m.income)}`} />
                    <div className="w-1/2 rounded-t bg-gray-300" style={{ height: `${(m.expense / max) * 100}%` }} title={`Dalje: ${eur(m.expense)}`} />
                  </div>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </Panel>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Zënia sipas ditës (këtë muaj)">
          {Object.values(weekday).some((v) => v > 0) ? (
            <BarList items={WD_ORDER.map((k) => ({ label: WD_AL[k], value: weekday[k] ?? 0, hint: `${weekday[k] ?? 0}` }))} />
          ) : (
            <EmptyState icon="📅" text="Ende s'ka check-in këtë muaj." />
          )}
        </Panel>
        <Panel title="Përbërja e ekipit">
          <BarList
            items={[
              { label: 'Klientë', value: counts.clients },
              { label: 'Trajnerë', value: counts.trainers },
              { label: 'Staf', value: counts.staff },
              { label: 'Grupe', value: counts.groups },
            ]}
          />
        </Panel>
      </div>

      {/* Quick actions */}
      <Panel title="Aksione të shpejta">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/admin/finance" icon="💰" label="Financat" accent="green" />
          <QuickAction to="/admin/clients" icon="👥" label="Klientët" accent="blue" />
          <QuickAction to="/admin/staff" icon="👔" label="Stafi" accent="teal" />
          <QuickAction to="/admin/cash-register" icon="🏧" label="Arka" accent="orange" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <Panel title="Transaksionet e fundit" className="lg:col-span-2">
          {transactions.length === 0 ? (
            <EmptyState icon="🧾" text="Ende s'ka transaksione. Shtoji te Financat." />
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => {
                const income = (t.type || '').toLowerCase() === 'income'
                return (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-700">
                        {income ? '↗' : '↘'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.description || t.category || 'Transaksion'}</p>
                        <p className="text-xs text-gray-400">{shortDate(t.transactionDate)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${income ? 'text-gray-900' : 'text-gray-500'}`}>
                      {income ? '+' : '−'}
                      {eur(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        {/* Pending invoices */}
        <Panel title="Fatura të papaguara">
          {pending.length === 0 ? (
            <EmptyState icon="✅" text="S'ka fatura të papaguara." />
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 6).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.client}</p>
                    <p className="text-xs text-gray-400">{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{eur(inv.totalAmount)}</p>
                    {inv.daysOverdue > 0 && <Badge accent="red">{inv.daysOverdue}d vonë</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </DashboardShell>
  )
}

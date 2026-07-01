import { ArrowDownRight, ArrowUpRight, Banknote, BarChart3, CalendarDays, CheckCircle, Dumbbell, Receipt, Sigma, User, Users, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { eur, shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  StatCardsSkeleton,
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
const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']

interface Tx { id: number; type: string; amount: number; description?: string; transactionDate?: string; category?: string }
interface PendingInvoice { id: number; invoiceNumber: string; client: string; totalAmount: number; daysOverdue: number }
interface TrainingGroupRow {
  id: number
  name: string
  trainer: string
  dayOfWeek: string
  scheduleStart: string
  scheduleEnd: string
  maxCapacity: number
  membersCount: number
}

const val = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value.data : null)
const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })

export default function AdminDashboard() {
  const { user } = useAuth()

  const summaryQ = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: async () => (await api.get('/finance/summary')).data as { totalIncome: number; totalExpenses: number; balance: number },
  })

  const countsQ = useQuery({
    queryKey: ['dashboard', 'counts'],
    queryFn: async () => {
      const r = await Promise.allSettled([
        api.get('/clients?page=1&pageSize=1'),
        api.get('/staff?page=1&pageSize=1'),
        api.get('/trainers?page=1&pageSize=1'),
        api.get('/traininggroups'),
      ])
      return {
        clients: val(r[0])?.total ?? 0,
        staff: val(r[1])?.total ?? 0,
        trainers: val(r[2])?.total ?? 0,
        groups: Array.isArray(val(r[3])) ? val(r[3]).length : 0,
      }
    },
  })

  const txQ = useQuery({
    queryKey: ['finance', 'transactions', 6],
    queryFn: async () => ((await api.get('/finance/transactions?page=1&pageSize=6')).data.transactions ?? []) as Tx[],
  })

  const pendingQ = useQuery({
    queryKey: ['invoice', 'pending'],
    queryFn: async () => {
      const d = (await api.get('/invoice/pending')).data
      return (Array.isArray(d) ? d : []) as PendingInvoice[]
    },
  })

  const weekdayQ = useQuery({
    queryKey: ['attendance', 'overview', 'byWeekday'],
    queryFn: async () => ((await api.get('/attendance/overview')).data?.byWeekday ?? {}) as Record<string, number>,
  })

  const groupsQ = useQuery({
    queryKey: ['traininggroups', 'dashboard'],
    queryFn: async () => ((await api.get('/traininggroups')).data ?? []) as TrainingGroupRow[],
  })

  const monthlyQ = useQuery({
    queryKey: ['finance', 'monthly6'],
    queryFn: async () => {
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, k) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      })
      const res = await Promise.allSettled(months.map((m) => api.get(`/finance/monthly-report?year=${m.year}&month=${m.month}`)))
      return res.map((r, i) => {
        const d = val(r)
        return { label: MONTHS[months[i].month - 1], income: d?.income?.total ?? 0, expense: d?.expenses?.total ?? 0 }
      })
    },
  })

  const summary = summaryQ.data ?? { totalIncome: 0, totalExpenses: 0, balance: 0 }
  const counts = countsQ.data ?? { clients: 0, staff: 0, trainers: 0, groups: 0 }
  const transactions = txQ.data ?? []
  const pending = pendingQ.data ?? []
  const weekday = weekdayQ.data ?? {}
  const monthly = monthlyQ.data ?? []
  const groups = groupsQ.data ?? []
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayGroups = groups.filter((g) => g.dayOfWeek === todayName).slice(0, 6)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Paneli i Adminit"
        title={`Mirë se erdhe, ${user?.name?.split(' ')[0] || 'Admin'}`}
        subtitle="Pamje e përgjithshme e palestrës, financave dhe operacioneve."
      />

      {summaryQ.isLoading ? (
        <StatCardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<ArrowUpRight className="h-5 w-5" />} label="Të hyrat (30 ditë)" value={eur(summary.totalIncome)} />
          <StatCard icon={<ArrowDownRight className="h-5 w-5" />} label="Shpenzimet (30 ditë)" value={eur(summary.totalExpenses)} />
          <StatCard icon={<Sigma className="h-5 w-5" />} label="Bilanci" value={eur(summary.balance)} sub={summary.balance >= 0 ? 'Pozitiv' : 'Negativ'} />
        </div>
      )}

      {countsQ.isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Klientë" value={counts.clients} />
          <StatCard icon={<Dumbbell className="h-5 w-5" />} label="Trajnerë" value={counts.trainers} />
          <StatCard icon={<User className="h-5 w-5" />} label="Staf" value={counts.staff} />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Grupe aktive" value={counts.groups} />
        </div>
      )}

      <div>
        <Panel title="Zënia e grupeve sot">
          {todayGroups.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="S'ka grupe të planifikuara për sot." />
          ) : (
            <div className="space-y-3">
              {todayGroups.map((g) => {
                const pct = Math.min(100, Math.round((g.membersCount / Math.max(1, g.maxCapacity)) * 100))
                return (
                  <div key={g.id} className="rounded-xl border border-gray-100 px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400">{timeOnly(g.scheduleStart)} · {g.trainer}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pct >= 100 ? 'bg-coral-50 text-coral-700' : 'bg-gray-100 text-gray-700'}`}>
                        {g.membersCount}/{g.maxCapacity}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-coral-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

      </div>

      <Panel
        title="Hyrje vs Dalje (6 muajt e fundit)"
        action={
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-coral-500" /> Hyrje</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Dalje</span>
          </div>
        }
      >
        {(() => {
          const max = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense]))
          const hasData = monthly.some((m) => m.income > 0 || m.expense > 0)
          if (!hasData) return <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="Ende s'ka të dhëna financiare për grafikun." />
          return (
            <div className="flex items-end justify-between gap-3 pt-2" style={{ height: 200 }}>
              {monthly.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="w-1/2 rounded-t bg-coral-500" style={{ height: `${(m.income / max) * 100}%` }} title={`Hyrje: ${eur(m.income)}`} />
                    <div className="w-1/2 rounded-t bg-gray-300" style={{ height: `${(m.expense / max) * 100}%` }} title={`Dalje: ${eur(m.expense)}`} />
                  </div>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Zënia sipas ditës (këtë muaj)">
          {Object.values(weekday).some((v) => v > 0) ? (
            <BarList items={WD_ORDER.map((k) => ({ label: WD_AL[k], value: weekday[k] ?? 0, hint: `${weekday[k] ?? 0}` }))} />
          ) : (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} text="Ende s'ka check-in këtë muaj." />
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

      <Panel title="Aksione të shpejta">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/admin/reports" icon={<BarChart3 className="h-5 w-5" />} label="Raporte" />
        <QuickAction to="/admin/finance" icon={<Wallet className="h-5 w-5" />} label="Financat" />
          <QuickAction to="/admin/clients" icon={<Users className="h-5 w-5" />} label="Klientët" />
          <QuickAction to="/admin/staff" icon={<User className="h-5 w-5" />} label="Stafi" />
          <QuickAction to="/admin/cash-register" icon={<Banknote className="h-5 w-5" />} label="Arka" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Transaksionet e fundit" className="lg:col-span-2">
          {transactions.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} text="Ende s'ka transaksione. Shtoji te Financat." />
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

        <Panel title="Fatura të papaguara">
          {pending.length === 0 ? (
            <EmptyState icon={<CheckCircle className="h-5 w-5" />} text="S'ka fatura të papaguara." />
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
                    {inv.daysOverdue > 0 && <Badge accent="gray">{inv.daysOverdue}d vonë</Badge>}
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

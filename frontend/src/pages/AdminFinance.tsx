import { ArrowDownRight, ArrowUpRight, Receipt, Sigma } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { eur, shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
} from '../components/DashboardKit'

interface Transaction {
  id: number
  type: string
  amount: number
  description: string
  category: string
  paymentMethod: string
  status: string
  transactionDate: string
}
interface Summary {
  totalIncome: number
  totalExpenses: number
  balance: number
}
interface Category {
  id: number
  name: string
  type: string
}
interface CatAmount {
  category: string
  amount: number
}
interface Report {
  period: string
  income: { total: number; byCategory: CatAmount[] }
  expenses: { total: number; byCategory: CatAmount[] }
  balance: number
}

const MONTHS = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']

const empty = { type: 'income', amount: '', description: '', categoryId: '', paymentMethod: 'cash' }

export default function AdminFinance() {
  const { addNotification } = useNotification()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, balance: 0 })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [showCat, setShowCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', type: 'income' })

  const today = new Date()
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    fetchData()
  }, [filter])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    api
      .get(`/finance/monthly-report?year=${period.year}&month=${period.month}`)
      .then((r) => setReport(r.data))
      .catch(() => setReport(null))
  }, [period, transactions])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = filter ? `?type=${filter}` : ''
      const [txRes, sumRes] = await Promise.allSettled([
        api.get(`/finance/transactions${params}`),
        api.get('/finance/summary'),
      ])
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data.transactions ?? [])
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
    } catch {
      setError('Ngarkimi i financave dështoi')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/finance/categories')
      setCategories(Array.isArray(res.data) ? res.data : [])
    } catch {
      /* ignore */
    }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/finance/add-transaction', {
        ...form,
        amount: toDecimal(form.amount),
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      })
      setShowForm(false)
      setForm(empty)
      addNotification('Sukses', 'Transaksioni u shtua.', 'success')
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Shtimi i transaksionit dështoi')
    }
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/finance/add-category', { ...newCat, description: '' })
      setShowCat(false)
      setNewCat({ name: '', type: 'income' })
      addNotification('Sukses', 'Kategoria u shtua.', 'success')
      await fetchCategories()
      const newId = res.data?.id
      if (newId) setForm((p) => ({ ...p, categoryId: String(newId) }))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Shtimi i kategorisë dështoi')
    }
  }

  const visibleCats = categories.filter((c) => c.type === form.type)

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const filters: { key: string; label: string }[] = [
    { key: '', label: 'Të gjitha' },
    { key: 'income', label: 'Hyrjet' },
    { key: 'expense', label: 'Daljet' },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Financa"
        title="Financat"
        subtitle="Të hyrat, shpenzimet dhe transaksionet e palestrës."
        right={
          <Button onClick={() => setShowForm((v) => !v)} className="bg-coral-500 text-white hover:bg-coral-600">
            {showForm ? 'Mbyll' : '+ Transaksion'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<ArrowUpRight className="h-5 w-5" />} accent="green" label="Të hyrat" value={eur(summary.totalIncome)} />
        <StatCard icon={<ArrowDownRight className="h-5 w-5" />} accent="red" label="Shpenzimet" value={eur(summary.totalExpenses)} />
        <StatCard icon={<Sigma className="h-5 w-5" />} accent={summary.balance >= 0 ? 'blue' : 'red'} label="Bilanci" value={eur(summary.balance)} />
      </div>

      <Panel
        title="Raporti mujor"
        action={
          <div className="flex gap-2">
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: parseInt(e.target.value) }))}
              className={`${fieldCls} w-28`}
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value) || p.year }))}
              className={`${fieldCls} w-24`}
            />
          </div>
        }
      >
        {(() => {
          const inc = report?.income.byCategory ?? []
          const exp = report?.expenses.byCategory ?? []
          const max = Math.max(1, ...inc.map((c) => c.amount), ...exp.map((c) => c.amount))
          const bars = (rows: CatAmount[]) =>
            rows.length === 0 ? (
              <p className="text-sm text-gray-400">Pa të dhëna.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((c) => (
                  <div key={c.category}>
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>{c.category || 'Pa kategori'}</span>
                      <span className="font-medium text-gray-700">{eur(c.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-coral-500" style={{ width: `${(c.amount / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">↗ Hyrjet</h3>
                  <span className="text-sm font-bold text-gray-900">{eur(report?.income.total ?? 0)}</span>
                </div>
                {bars(inc)}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">↘ Daljet</h3>
                  <span className="text-sm font-bold text-gray-900">{eur(report?.expenses.total ?? 0)}</span>
                </div>
                {bars(exp)}
              </div>
            </div>
          )
        })()}
      </Panel>

      {error && (
        <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>
      )}

      {showForm && (
        <Panel title="Shto transaksion">
          <form onSubmit={add} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Lloji">
                <select name="type" value={form.type} onChange={change} className={fieldCls}>
                  <option value="income">Hyrje</option>
                  <option value="expense">Dalje</option>
                </select>
              </Field>
              <Field label="Shuma (€)">
                <input type="text" inputMode="decimal" name="amount" value={form.amount} onChange={change} required className={fieldCls} />
              </Field>
              <Field label="Përshkrimi">
                <input name="description" value={form.description} onChange={change} required className={fieldCls} />
              </Field>
              <Field label="Kategoria">
                <div className="flex gap-2">
                  <select name="categoryId" value={form.categoryId} onChange={change} className={fieldCls}>
                    <option value="">— Zgjedh —</option>
                    {visibleCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setNewCat({ name: '', type: form.type }); setShowCat((v) => !v) }}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    + Re
                  </button>
                </div>
              </Field>
              <Field label="Metoda e pagesës">
                <select name="paymentMethod" value={form.paymentMethod} onChange={change} className={fieldCls}>
                  <option value="cash">Kontant</option>
                  <option value="card">Kartë</option>
                  <option value="transfer">Transfertë</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className="bg-coral-500 text-white hover:bg-coral-600">Shto transaksionin</Button>
          </form>

          {showCat && (
            <form onSubmit={addCategory} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-4">
              <div className="w-48">
                <Field label="Emri i kategorisë">
                  <input value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} required className={fieldCls} />
                </Field>
              </div>
              <div className="w-40">
                <Field label="Lloji">
                  <select value={newCat.type} onChange={(e) => setNewCat((p) => ({ ...p, type: e.target.value }))} className={fieldCls}>
                    <option value="income">Hyrje</option>
                    <option value="expense">Dalje</option>
                  </select>
                </Field>
              </div>
              <Button type="submit" variant="outline">Ruaj kategorinë</Button>
            </form>
          )}
        </Panel>
      )}

      <Panel
        title="Transaksionet"
        action={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.key ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : transactions.length === 0 ? (
          <EmptyState icon={<Receipt className="h-5 w-5" />} text="Ende s'ka transaksione. Shto të parin me '+ Transaksion'." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Data</th>
                  <th className="px-3 py-2 font-semibold">Lloji</th>
                  <th className="px-3 py-2 font-semibold">Kategoria</th>
                  <th className="px-3 py-2 font-semibold">Përshkrimi</th>
                  <th className="px-3 py-2 text-right font-semibold">Shuma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((t) => {
                  const income = (t.type || '').toLowerCase() === 'income'
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-600">{shortDate(t.transactionDate)}</td>
                      <td className="px-3 py-3">
                        <Badge accent={income ? 'green' : 'red'}>{income ? 'Hyrje' : 'Dalje'}</Badge>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{t.category || '—'}</td>
                      <td className="px-3 py-3 text-gray-800">{t.description}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${income ? 'text-gray-900' : 'text-gray-500'}`}>
                        {income ? '+' : '−'}
                        {eur(t.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  )
}

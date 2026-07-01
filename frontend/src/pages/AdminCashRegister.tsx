import { ArrowDownRight, ArrowUpRight, Banknote, Circle, Landmark, Receipt } from 'lucide-react'
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
  primaryBtn,
} from '../components/DashboardKit'

interface Register {
  id: number
  openingBalance: number
  closingBalance?: number
  totalIncome?: number
  totalExpense?: number
  status: string
  openedAt: string
  closedAt?: string
}

interface Tx {
  id: number
  clientId?: number
  amount: number
  method: string
  status: string
  receiptNumber?: string
  createdAt: string
}

export default function AdminCashRegister() {
  const { addNotification } = useNotification()
  const [current, setCurrent] = useState<Register | null>(null)
  const [history, setHistory] = useState<Register[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('0')
  const [closing, setClosing] = useState('0')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [cur, hist, pay] = await Promise.allSettled([
      api.get('/cashregister/current'),
      api.get('/cashregister/history'),
      api.get('/payments?page=1&pageSize=25'),
    ])
    setCurrent(cur.status === 'fulfilled' ? cur.value.data : null)
    setHistory(hist.status === 'fulfilled' ? (Array.isArray(hist.value.data) ? hist.value.data : hist.value.data.history ?? []) : [])
    setTxs(pay.status === 'fulfilled' && Array.isArray(pay.value.data) ? pay.value.data : [])
    setLoading(false)
  }

  const refund = async (tx: Tx) => {
    const raw = window.prompt(`Shuma për refund (max ${tx.amount}€):`, String(tx.amount))
    if (raw == null) return
    const amount = toDecimal(raw)
    if (isNaN(amount) || amount <= 0 || amount > tx.amount) {
      addNotification('Gabim', 'Shumë e pavlefshme.', 'error')
      return
    }
    try {
      await api.post(`/payments/${tx.id}/refund`, { amount })
      addNotification('Refund', `U kthyen ${amount}€ për kuponin ${tx.receiptNumber ?? tx.id}.`, 'success')
      load()
    } catch (err: any) {
      const data = err.response?.data
      addNotification(data?.needsAdmin ? 'Kërkon admin' : 'Gabim', data?.message || 'Refund dështoi.', 'error')
    }
  }

  const open = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/cashregister/open', { openingBalance: toDecimal(opening) })
      setOpening('0')
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Hapja e arkës dështoi')
    }
  }

  const close = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!current) return
    setError('')
    try {
      await api.post(`/cashregister/${current.id}/close`, { closingBalance: toDecimal(closing) })
      setClosing('0')
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mbyllja e arkës dështoi')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader badge="Recepsion" title="Arka" subtitle="Hap, mbyll dhe ndiq arkën ditore." />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      {loading ? (
        <Panel title="Gjendja e arkës"><p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p></Panel>
      ) : current ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard icon={<Circle className="h-5 w-5" />} label="Statusi" value="Hapur" sub={`Hapur ${shortDate(current.openedAt)}`} />
            <StatCard icon={<Landmark className="h-5 w-5" />} label="Gjendja fillestare" value={eur(current.openingBalance)} />
            <StatCard icon={<ArrowUpRight className="h-5 w-5" />} label="Të hyra" value={eur(current.totalIncome ?? 0)} />
            <StatCard icon={<ArrowDownRight className="h-5 w-5" />} label="Dalje" value={eur(current.totalExpense ?? 0)} />
          </div>
          <Panel title="Mbyll arkën">
            <form onSubmit={close} className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <Field label="Gjendja përfundimtare (€)">
                  <input type="text" inputMode="decimal" value={closing} onChange={(e) => setClosing(e.target.value)} className={fieldCls} />
                </Field>
              </div>
              <Button type="submit" className={primaryBtn}>Mbyll arkën</Button>
            </form>
          </Panel>
        </>
      ) : (
        <Panel title="Hap arkën">
          <p className="mb-4 text-sm text-gray-500">Nuk ka arkë të hapur për sot. Hape për të nisur ditën.</p>
          <form onSubmit={open} className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Field label="Gjendja fillestare (€)">
                <input type="text" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} className={fieldCls} />
              </Field>
            </div>
            <Button type="submit" className={primaryBtn}>Hap arkën</Button>
          </form>
        </Panel>
      )}

      <Panel title="Transaksionet e fundit & Rimbursim">
        {txs.length === 0 ? (
          <EmptyState icon={<Receipt className="h-5 w-5" />} text="Ende s'ka transaksione." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Kuponi</th>
                  <th className="px-3 py-2 font-semibold">Data</th>
                  <th className="px-3 py-2 font-semibold">Shuma</th>
                  <th className="px-3 py-2 font-semibold">Metoda</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txs.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600">{t.receiptNumber ?? `#${t.id}`}</td>
                    <td className="px-3 py-3 text-gray-600">{shortDate(t.createdAt)}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{eur(t.amount)}</td>
                    <td className="px-3 py-3 text-gray-600">{t.method}</td>
                    <td className="px-3 py-3">
                      <Badge accent={t.status === 'paid' ? 'green' : t.status === 'refunded' ? 'gray' : 'gray'}>{t.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {t.status === 'paid' && t.amount > 0 && (
                        <Button size="sm" variant="outline" onClick={() => refund(t)}>Refund</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Historiku i arkës">
        {history.length === 0 ? (
          <EmptyState icon={<Banknote className="h-5 w-5" />} text="Ende s'ka histori arke." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Hapur</th>
                  <th className="px-3 py-2 font-semibold">Mbyllur</th>
                  <th className="px-3 py-2 font-semibold">Fillestare</th>
                  <th className="px-3 py-2 font-semibold">Përfundimtare</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600">{shortDate(r.openedAt)}</td>
                    <td className="px-3 py-3 text-gray-600">{r.closedAt ? shortDate(r.closedAt) : '—'}</td>
                    <td className="px-3 py-3 text-gray-800">{eur(r.openingBalance)}</td>
                    <td className="px-3 py-3 text-gray-800">{r.closingBalance != null ? eur(r.closingBalance) : '—'}</td>
                    <td className="px-3 py-3"><Badge accent={r.status === 'open' ? 'green' : 'gray'}>{r.status === 'open' ? 'Hapur' : 'Mbyllur'}</Badge></td>
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

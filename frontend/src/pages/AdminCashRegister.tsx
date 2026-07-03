import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Circle,
  Landmark,
  Receipt,
  User,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
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

interface Product {
  id: number
  name: string
  unit?: string
  salePrice: number
  stock: number
  isActive: boolean
}

interface ClientLite {
  id: number
  name: string
}

interface CartItem {
  product: Product
  quantity: number
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

  // POS state
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [clientId, setClientId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [posLoading, setPosLoading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (current) {
      api.get('/inventory/products').then((r) => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => setProducts([]))
      api.get('/clients?pageSize=200').then((r) => setClients(r.data?.clients ?? [])).catch(() => setClients([]))
    }
  }, [current])

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

  const markPaid = async (tx: Tx) => {
    if (!window.confirm(`Shëno kuponin ${tx.receiptNumber ?? tx.id} si të paguar (${eur(tx.amount)})?`)) return
    try {
      await api.post(`/payments/${tx.id}/mark-paid`, {})
      addNotification('Sukses', 'Borgji u shënua i paguar.', 'success')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Nuk u arrit të shënohej i paguar.', 'error')
    }
  }

  const refund = async (tx: Tx) => {
    const raw = window.prompt(`Shuma për rimbursim (max ${tx.amount}€):`, String(tx.amount))
    if (raw == null) return
    const amount = toDecimal(raw)
    if (isNaN(amount) || amount <= 0 || amount > tx.amount) {
      addNotification('Gabim', 'Shumë e pavlefshme.', 'error')
      return
    }
    try {
      await api.post(`/payments/${tx.id}/refund`, { amount })
      addNotification('Rimbursim', `U kthyen ${amount}€ për kuponin ${tx.receiptNumber ?? tx.id}.`, 'success')
      load()
    } catch (err: any) {
      const data = err.response?.data
      addNotification(data?.needsAdmin ? 'Kërkon admin' : 'Gabim', data?.message || 'Rimbursimi dështoi.', 'error')
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

  const addToCart = () => {
    const product = products.find((p) => p.id === Number(selectedProductId))
    const qty = parseInt(quantity || '0', 10)
    if (!product || qty <= 0) {
      addNotification('Gabim', 'Zgjedh një produkt dhe sasi të vlefshme.', 'error')
      return
    }
    if (qty > product.stock) {
      addNotification('Gabim', `Stok i pamjaftueshëm për "${product.name}". Në dispozicion: ${product.stock}`, 'error')
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i))
      }
      return [...prev, { product, quantity: qty }]
    })
    setSelectedProductId('')
    setQuantity('1')
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.product.salePrice, 0),
    [cart]
  )

  const checkout = async (asDebt = false) => {
    if (!current) return
    if (!clientId) {
      addNotification('Gabim', 'Zgjedh klientin për shitjen.', 'error')
      return
    }
    if (cart.length === 0) {
      addNotification('Gabim', 'Shporta është bosh.', 'error')
      return
    }
    setPosLoading(true)
    try {
      const res = await api.post('/payments/pos-checkout', {
        clientId: parseInt(clientId, 10),
        method: paymentMethod,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        idempotencyKey: `pos-${current.id}-${Date.now()}`,
        asDebt,
      })
      addNotification(
        'Sukses',
        asDebt
          ? `U shtua si borgj. Kuponi: ${res.data.receiptNumber}`
          : `Pagesa u regjistrua. Kuponi: ${res.data.receiptNumber}`,
        'success'
      )
      setCart([])
      setClientId('')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || (asDebt ? 'Shtimi si borgj dështoi.' : 'Pagesa dështoi.'), 'error')
    } finally {
      setPosLoading(false)
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

          <Panel title="Shitje në arkë (POS)">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="Klienti">
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      required
                      className={`${fieldCls} pl-9`}
                    >
                      <option value="" disabled>Zgjedh klientin…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                  <Field label="Produkti">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className={`${fieldCls} pl-9`}
                      >
                        <option value="">Zgjedh produktin…</option>
                        {products
                          .filter((p) => p.isActive !== false && p.stock > 0)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {eur(p.salePrice)} (stok: {p.stock})
                            </option>
                          ))}
                      </select>
                    </div>
                  </Field>
                  </div>
                  <Field label="Sasia">
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={fieldCls}
                    />
                  </Field>
                </div>
                <Button type="button" variant="outline" onClick={addToCart}>
                  <Plus className="mr-2 h-4 w-4" /> Shto në shportë
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Shporta</p>
                {cart.length === 0 ? (
                  <EmptyState icon={<ShoppingCart className="h-5 w-5" />} text="Shporta është bosh." />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-3 py-2 font-semibold">Produkti</th>
                          <th className="px-3 py-2 font-semibold">Sasia</th>
                          <th className="px-3 py-2 font-semibold">Totali</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cart.map((i) => (
                          <tr key={i.product.id}>
                            <td className="px-3 py-2 text-gray-800">{i.product.name}</td>
                            <td className="px-3 py-2 text-gray-600">{i.quantity}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{eur(i.quantity * i.product.salePrice)}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeFromCart(i.product.id)} className="text-gray-400 hover:text-gray-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm font-semibold text-gray-900">
                  <span>Totali</span>
                  <span>{eur(cartTotal)}</span>
                </div>
                <Field label="Metoda e pagesës">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={fieldCls}>
                    <option value="cash">Kontant</option>
                    <option value="card">Kartë</option>
                    <option value="transfer">Transfertë</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => checkout(true)}
                    disabled={posLoading || cart.length === 0}
                    className="w-full"
                  >
                    {posLoading ? 'Duke përpunuar…' : `Shto si borgj (${eur(cartTotal)})`}
                  </Button>
                  <Button onClick={() => checkout(false)} disabled={posLoading || cart.length === 0} className={`w-full ${primaryBtn}`}>
                    {posLoading ? 'Duke përpunuar…' : `Paguaj ${eur(cartTotal)}`}
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

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
                      <Badge accent={t.status === 'paid' ? 'green' : 'gray'}>
                        {t.status === 'paid' ? 'Paguar' : t.status === 'pending' ? 'Borgj' : t.status === 'refunded' ? 'Rimbursuar' : t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {t.status === 'paid' && t.amount > 0 && (
                        <Button size="sm" variant="outline" onClick={() => refund(t)}>Rimbursim</Button>
                      )}
                      {t.status === 'pending' && (
                        <Button size="sm" className={primaryBtn} onClick={() => markPaid(t)}>Shëno të paguar</Button>
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

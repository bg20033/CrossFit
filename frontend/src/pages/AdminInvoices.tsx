import { Banknote, CheckCircle, Clock, Receipt } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { toDecimal } from '../utils/number'
import { eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Invoice {
  id: number
  invoiceNumber: string
  client: string
  totalAmount: number
  daysOverdue: number
}
interface Item {
  description: string
  quantity: string
  unitPrice: string
}
interface ClientLite {
  id: number
  name: string
}
interface GroupLite {
  id: number
  name: string
  membersCount: number
  maxCapacity: number
}

const blankItem: Item = { description: '', quantity: '1', unitPrice: '0' }

export default function AdminInvoices() {
  const { addNotification } = useNotification()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ clientId: '', description: '', taxPercent: '0', paymentMethod: 'cash', dueDate: '', groupId: '' })
  const [items, setItems] = useState<Item[]>([{ ...blankItem }])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [groups, setGroups] = useState<GroupLite[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  useEffect(() => {
    fetchPending()
  }, [])

  useEffect(() => {
    if (showCreate) {
      api.get('/clients?pageSize=200').then((r) => setClients(r.data?.clients ?? [])).catch(() => setClients([]))
      setGroups([])
      setForm((f) => ({ ...f, groupId: '' }))
    }
  }, [showCreate])

  useEffect(() => {
    if (form.clientId && showCreate) {
      setSuggestLoading(true)
      api.get(`/traininggroups/suggest-for-client?clientId=${form.clientId}`)
        .then((r) => setGroups(Array.isArray(r.data) ? r.data : []))
        .catch(() => setGroups([]))
        .finally(() => setSuggestLoading(false))
    } else {
      setGroups([])
    }
  }, [form.clientId, showCreate])

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await api.get('/invoice/pending')
      setInvoices(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Ngarkimi i faturave dështoi')
    } finally {
      setLoading(false)
    }
  }

  const markPaid = async (id: number) => {
    try {
      const res = await api.post('/payments/checkout', { invoiceId: id, method: 'cash', idempotencyKey: `invoice-${id}-cash` })
      addNotification('Sukses', `Pagesa u regjistrua. Kuponi: ${res.data.receiptNumber}`, 'success')
      fetchPending()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Veprimi dështoi')
    }
  }

  const setItem = (i: number, key: keyof Item, value: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))
  const addItem = () => setItems((arr) => [...arr, { ...blankItem }])
  const removeItem = (i: number) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr))

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0)
  const taxAmount = (subtotal * Number(form.taxPercent || 0)) / 100
  const grandTotal = subtotal + taxAmount

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/invoice/create', {
        clientId: parseInt(form.clientId),
        description: form.description,
        taxPercent: toDecimal(form.taxPercent || '0'),
        paymentMethod: form.paymentMethod,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        items: items.map((it, idx) => ({
          description: it.description,
          quantity: parseInt(it.quantity || '0'),
          unitPrice: toDecimal(it.unitPrice || '0'),
          groupId: idx === 0 && form.groupId ? parseInt(form.groupId) : undefined,
        })),
      })
      setShowCreate(false)
      setForm({ clientId: '', description: '', taxPercent: '0', paymentMethod: 'cash', dueDate: '', groupId: '' })
      setItems([{ ...blankItem }])
      setGroups([])
      addNotification('Sukses', 'Fatura u krijua.', 'success')
      fetchPending()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || err.response?.data || 'Krijimi i faturës dështoi.', 'error')
    }
  }

  const total = invoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0)
  const overdue = invoices.filter((i) => i.daysOverdue > 0).length

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Financa"
        title="Faturat"
        subtitle="Krijo fatura dhe ndiq arkëtimet."
        right={
          <Button onClick={() => setShowCreate(true)} className={primaryBtn}>+ Faturë e re</Button>
        }
      />

      {error && <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Fatura të papaguara" value={loading ? '…' : invoices.length} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Të vonuara" value={loading ? '…' : overdue} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Borxh total" value={loading ? '…' : eur(total)} />
      </div>

      <Panel title="Të papaguara">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<CheckCircle className="h-5 w-5" />} text="S'ka fatura të papaguara." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Fatura</th>
                  <th className="px-3 py-2 font-semibold">Klienti</th>
                  <th className="px-3 py-2 font-semibold">Shuma</th>
                  <th className="px-3 py-2 font-semibold">Vonesa</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 text-gray-600">{inv.client}</td>
                    <td className="px-3 py-3 text-gray-800">{eur(inv.totalAmount)}</td>
                    <td className="px-3 py-3">
                      {inv.daysOverdue > 0 ? <Badge accent="gray">{inv.daysOverdue} ditë</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" className="bg-coral-500 text-white hover:bg-coral-600" onClick={() => markPaid(inv.id)}>
                        Shëno si paguar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showCreate && (
        <Modal title="Krijo faturë" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Klienti">
                <select value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} required className={fieldCls}>
                  <option value="" disabled>Zgjedh klientin…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Afati (dueDate)"><input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className={fieldCls} /></Field>
            </div>
            <Field label="Përshkrimi"><input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={fieldCls} /></Field>

            {form.clientId && (
              <Field label="Grupi (opsional)">
                <select value={form.groupId} onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))} className={fieldCls}>
                  <option value="">Pa grup — vetëm faturë</option>
                  {suggestLoading ? (
                    <option value="" disabled>Duke ngarkuar…</option>
                  ) : (
                    groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.membersCount}/{g.maxCapacity})
                      </option>
                    ))
                  )}
                </select>
                {!suggestLoading && groups.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">S'ka grupe të përshtatshëm (të gjitha të plota ose konflikt orari).</p>
                )}
              </Field>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Artikujt</p>
                <button type="button" onClick={addItem} className="text-sm font-medium text-gray-600 hover:text-gray-900">+ Shto rresht</button>
              </div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Përshkrimi" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} required className={`${fieldCls} flex-1`} />
                    <input type="number" placeholder="Sasia" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} className={`${fieldCls} w-20`} />
                    <input type="text" inputMode="decimal" placeholder="Çmimi" value={it.unitPrice} onChange={(e) => setItem(i, 'unitPrice', e.target.value)} className={`${fieldCls} w-24`} />
                    <button type="button" onClick={() => removeItem(i)} className="px-2 text-gray-400 hover:text-gray-700">X</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tatimi (%)"><input type="text" inputMode="decimal" value={form.taxPercent} onChange={(e) => setForm((p) => ({ ...p, taxPercent: e.target.value }))} className={fieldCls} /></Field>
              <Field label="Metoda e pagesës">
                <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))} className={fieldCls}>
                  <option value="cash">Kontant</option>
                  <option value="card">Kartë</option>
                  <option value="transfer">Transfertë</option>
                </select>
              </Field>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between text-gray-500"><span>Nëntotali</span><span>{eur(subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tatimi</span><span>{eur(taxAmount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900"><span>Totali</span><span>{eur(grandTotal)}</span></div>
            </div>

            <Button type="submit" className={`w-full ${primaryBtn}`}>Krijo faturën</Button>
          </form>
        </Modal>
      )}
    </DashboardShell>
  )
}

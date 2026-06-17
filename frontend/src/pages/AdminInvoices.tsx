import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
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

const blankItem: Item = { description: '', quantity: '1', unitPrice: '0' }

export default function AdminInvoices() {
  const { addNotification } = useNotification()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ clientId: '', description: '', taxPercent: '0', paymentMethod: 'cash', dueDate: '' })
  const [items, setItems] = useState<Item[]>([{ ...blankItem }])

  useEffect(() => {
    fetchPending()
  }, [])

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
      await api.post(`/invoice/${id}/mark-paid`, { paymentMethod: 'cash' })
      addNotification('Sukses', 'Fatura u shënua si e paguar.', 'success')
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
        taxPercent: parseFloat(form.taxPercent || '0'),
        paymentMethod: form.paymentMethod,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        items: items.map((it) => ({
          description: it.description,
          quantity: parseInt(it.quantity || '0'),
          unitPrice: parseFloat(it.unitPrice || '0'),
        })),
      })
      setShowCreate(false)
      setForm({ clientId: '', description: '', taxPercent: '0', paymentMethod: 'cash', dueDate: '' })
      setItems([{ ...blankItem }])
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
        <StatCard icon="🧾" label="Fatura të papaguara" value={loading ? '…' : invoices.length} />
        <StatCard icon="⏰" label="Të vonuara" value={loading ? '…' : overdue} />
        <StatCard icon="💶" label="Borxh total" value={loading ? '…' : eur(total)} />
      </div>

      <Panel title="Të papaguara">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : invoices.length === 0 ? (
          <EmptyState icon="✅" text="S'ka fatura të papaguara." />
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
              <Field label="Client ID"><input type="number" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} required className={fieldCls} /></Field>
              <Field label="Afati (dueDate)"><input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className={fieldCls} /></Field>
            </div>
            <Field label="Përshkrimi"><input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={fieldCls} /></Field>

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
                    <input type="number" step="0.01" placeholder="Çmimi" value={it.unitPrice} onChange={(e) => setItem(i, 'unitPrice', e.target.value)} className={`${fieldCls} w-24`} />
                    <button type="button" onClick={() => removeItem(i)} className="px-2 text-gray-400 hover:text-gray-700">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tatimi (%)"><input type="number" step="0.01" value={form.taxPercent} onChange={(e) => setForm((p) => ({ ...p, taxPercent: e.target.value }))} className={fieldCls} /></Field>
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

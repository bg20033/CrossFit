import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Search, Trash2, Edit2, ArrowDownCircle, History } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { toDecimal, parseDecimal } from '../utils/number'
import { eur, shortDate } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Field,
  fieldCls,
  EmptyState,
  Badge,
  Modal,
  primaryBtn,
} from '../components/DashboardKit'

interface Product {
  id: number
  name: string
  sku?: string
  description?: string
  unit?: string
  salePrice: number
  costPrice?: number
  lowStockThreshold: number
  isActive: boolean
  stock: number
}

interface Movement {
  id: number
  movementType: string
  quantity: number
  unitCost?: number
  notes?: string
  createdAt: string
}

const blankForm = {
  name: '',
  sku: '',
  description: '',
  unit: 'copë',
  salePrice: '',
  costPrice: '',
  lowStockThreshold: '10',
  isActive: true,
}

export default function AdminInventory() {
  const { addNotification } = useNotification()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(blankForm)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockQty, setStockQty] = useState('1')
  const [stockCost, setStockCost] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventory/products')
      setProducts(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ngarkimi i inventarit dështoi.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    )
  }, [products, search])

  const openCreate = () => {
    setEditing(null)
    setForm(blankForm)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      description: p.description ?? '',
      unit: p.unit ?? 'copë',
      salePrice: String(p.salePrice ?? 0),
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      lowStockThreshold: String(p.lowStockThreshold ?? 10),
      isActive: p.isActive,
    })
    setShowForm(true)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
      unit: form.unit.trim() || undefined,
      salePrice: toDecimal(form.salePrice),
      costPrice: parseDecimal(form.costPrice) ?? undefined,
      lowStockThreshold: parseInt(form.lowStockThreshold || '10', 10),
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await api.put(`/inventory/products/${editing.id}`, payload)
        addNotification('Sukses', 'Produkti u përditësua.', 'success')
      } else {
        await api.post('/inventory/products', payload)
        addNotification('Sukses', 'Produkti u krijua.', 'success')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ruajtja dështoi.', 'error')
    }
  }

  const remove = async (p: Product) => {
    if (!window.confirm(`Fshirja e "${p.name}"?`)) return
    try {
      await api.delete(`/inventory/products/${p.id}`)
      addNotification('Sukses', 'Produkti u fshi/deaktivizua.', 'success')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Fshirja dështoi.', 'error')
    }
  }

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockProduct) return
    try {
      await api.post(`/inventory/products/${stockProduct.id}/stock-in`, {
        quantity: parseInt(stockQty || '0', 10),
        unitCost: parseDecimal(stockCost) ?? undefined,
        notes: stockNotes.trim() || undefined,
      })
      addNotification('Sukses', `Stoku për "${stockProduct.name}" u shtua.`, 'success')
      setStockProduct(null)
      setStockQty('1')
      setStockCost('')
      setStockNotes('')
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Shtimi i stokut dështoi.', 'error')
    }
  }

  const loadHistory = async (p: Product) => {
    setHistoryProduct(p)
    try {
      const res = await api.get(`/inventory/products/${p.id}/movements`)
      setMovements(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setMovements([])
      addNotification('Gabim', err.response?.data?.message || 'Ngarkimi i historikut dështoi.', 'error')
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Admin"
        title="Inventari"
        subtitle="Menaxho produktet dhe shto stokun."
        right={
          <Button onClick={openCreate} className={primaryBtn}>
            <Plus className="mr-2 h-4 w-4" /> Produkt i ri
          </Button>
        }
      />

      <Panel title="Produktet">
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kërko sipas emri ose SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-5 w-5" />} text="S'ka produakte. Shto një produkt për të filluar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Produkti</th>
                  <th className="px-3 py-2 font-semibold">SKU</th>
                  <th className="px-3 py-2 font-semibold">Çmimi</th>
                  <th className="px-3 py-2 font-semibold">Stoku</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.unit && <p className="text-xs text-gray-400">{p.unit}</p>}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{p.sku || '—'}</td>
                    <td className="px-3 py-3 text-gray-800">{eur(p.salePrice)}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-800">{p.stock}</span>
                      {p.stock <= p.lowStockThreshold && (
                        <Badge accent="gray">stok i ulët</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge accent={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Aktiv' : 'Joaktiv'}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadHistory(p)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStockProduct(p)}>
                          <ArrowDownCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => remove(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showForm && (
        <Modal title={editing ? 'Përditëso produktin' : 'Produkt i ri'} onClose={() => setShowForm(false)}>
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emri">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={fieldCls} />
              </Field>
              <Field label="SKU">
                <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className={fieldCls} />
              </Field>
            </div>
            <Field label="Përshkrimi">
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Njësia">
                <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Çmimi i shitjes (€)">
                <input type="text" inputMode="decimal" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} required className={fieldCls} />
              </Field>
              <Field label="Çmimi i kostos (€)">
                <input type="text" inputMode="decimal" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} className={fieldCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limit stok të ulët">
                <input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Aktiv">
                <select value={String(form.isActive)} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} className={fieldCls}>
                  <option value="true">Po</option>
                  <option value="false">Jo</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className={`w-full ${primaryBtn}`}>{editing ? 'Ruaj ndryshimet' : 'Krijo produktin'}</Button>
          </form>
        </Modal>
      )}

      {stockProduct && (
        <Modal title={`Shto stok — ${stockProduct.name}`} onClose={() => setStockProduct(null)}>
          <form onSubmit={addStock} className="space-y-4">
            <p className="text-sm text-gray-500">Stoku aktual: <strong>{stockProduct.stock}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sasia">
                <input type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} required className={fieldCls} />
              </Field>
              <Field label="Kosto për njësi (€)">
                <input type="text" inputMode="decimal" value={stockCost} onChange={(e) => setStockCost(e.target.value)} className={fieldCls} />
              </Field>
            </div>
            <Field label="Shënim">
              <input value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} className={fieldCls} />
            </Field>
            <Button type="submit" className={`w-full ${primaryBtn}`}>Shto stokun</Button>
          </form>
        </Modal>
      )}

      {historyProduct && (
        <Modal title={`Historiku — ${historyProduct.name}`} onClose={() => setHistoryProduct(null)}>
          {movements.length === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} text="Ende s'ka lëvizje stoku." />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 font-semibold">Data</th>
                    <th className="py-2 font-semibold">Lloji</th>
                    <th className="py-2 font-semibold">Sasia</th>
                    <th className="py-2 font-semibold">Shënim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 text-gray-600">{shortDate(m.createdAt)}</td>
                      <td className="py-2"><Badge accent={m.movementType === 'in' ? 'green' : 'gray'}>{m.movementType}</Badge></td>
                      <td className="py-2 text-gray-800">{m.quantity}</td>
                      <td className="py-2 text-gray-500">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </DashboardShell>
  )
}


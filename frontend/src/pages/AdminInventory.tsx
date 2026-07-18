import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Minus, Search, Trash2, Edit2, History, ChevronDown } from 'lucide-react'
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

const blankQuickAdd = {
  name: '',
  salePrice: '',
  initialStock: '',
  // advanced (collapsed by default)
  sku: '',
  unit: 'copë',
  costPrice: '',
  lowStockThreshold: '10',
  description: '',
}

const blankEdit = {
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

  // Quick add
  const [quick, setQuick] = useState(blankQuickAdd)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [adding, setAdding] = useState(false)

  // Inline stock: one qty draft per product row (defaults to 1)
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({})
  const [busyProductId, setBusyProductId] = useState<number | null>(null)

  // Edit + history modals
  const [editing, setEditing] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState(blankEdit)
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

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      await api.post('/inventory/products', {
        name: quick.name.trim(),
        salePrice: toDecimal(quick.salePrice),
        initialStock: parseInt(quick.initialStock || '0', 10) || 0,
        sku: quick.sku.trim() || undefined,
        unit: quick.unit.trim() || undefined,
        costPrice: parseDecimal(quick.costPrice) ?? undefined,
        lowStockThreshold: parseInt(quick.lowStockThreshold || '10', 10),
        description: quick.description.trim() || undefined,
        isActive: true,
      })
      addNotification('Sukses', `"${quick.name.trim()}" u shtua në inventar.`, 'success')
      setQuick(blankQuickAdd)
      setShowAdvanced(false)
      load()
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Shtimi i produktit dështoi.', 'error')
    } finally {
      setAdding(false)
    }
  }

  const rowQty = (p: Product) => {
    const raw = qtyDraft[p.id] ?? '1'
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const adjustStock = async (p: Product, direction: 1 | -1) => {
    const qty = rowQty(p)
    if (qty <= 0) {
      addNotification('Gabim', 'Shkruaj një sasi të vlefshme.', 'error')
      return
    }
    setBusyProductId(p.id)
    try {
      const res = await api.post(`/inventory/products/${p.id}/adjust`, { delta: direction * qty })
      const currentStock = res.data?.currentStock
      setProducts((list) =>
        list.map((x) => (x.id === p.id ? { ...x, stock: typeof currentStock === 'number' ? currentStock : x.stock } : x))
      )
      setQtyDraft((d) => ({ ...d, [p.id]: '1' }))
    } catch (err: any) {
      addNotification('Gabim', err.response?.data?.message || 'Ndryshimi i stokut dështoi.', 'error')
    } finally {
      setBusyProductId(null)
    }
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setEditForm({
      name: p.name,
      sku: p.sku ?? '',
      description: p.description ?? '',
      unit: p.unit ?? 'copë',
      salePrice: String(p.salePrice ?? 0),
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      lowStockThreshold: String(p.lowStockThreshold ?? 10),
      isActive: p.isActive,
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await api.put(`/inventory/products/${editing.id}`, {
        name: editForm.name.trim(),
        sku: editForm.sku.trim() || undefined,
        description: editForm.description.trim() || undefined,
        unit: editForm.unit.trim() || undefined,
        salePrice: toDecimal(editForm.salePrice),
        costPrice: parseDecimal(editForm.costPrice) ?? undefined,
        lowStockThreshold: parseInt(editForm.lowStockThreshold || '10', 10),
        isActive: editForm.isActive,
      })
      addNotification('Sukses', 'Produkti u përditësua.', 'success')
      setEditing(null)
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
      <DashboardHeader badge="Admin" title="Inventari" subtitle="Shto produkte dhe menaxho stokun direkt nga tabela." />

      <Panel title="Shto produkt të ri">
        <form onSubmit={quickAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <Field label="Emri">
              <input
                value={quick.name}
                onChange={(e) => setQuick((f) => ({ ...f, name: e.target.value }))}
                placeholder="p.sh. Ujë 0.5L"
                required
                className={fieldCls}
              />
            </Field>
            <Field label="Çmimi (€)">
              <input
                type="text"
                inputMode="decimal"
                value={quick.salePrice}
                onChange={(e) => setQuick((f) => ({ ...f, salePrice: e.target.value }))}
                placeholder="0.00"
                required
                className={fieldCls}
              />
            </Field>
            <Field label="Stoku fillestar">
              <input
                type="number"
                min={0}
                value={quick.initialStock}
                onChange={(e) => setQuick((f) => ({ ...f, initialStock: e.target.value }))}
                placeholder="0"
                className={fieldCls}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={adding} className={`${primaryBtn} w-full sm:w-auto`}>
                <Plus className="mr-1 h-4 w-4" /> {adding ? 'Duke shtuar…' : 'Shto'}
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition ${showAdvanced ? 'rotate-180' : ''}`} />
            Më shumë opsione (SKU, kosto, njësia…)
          </button>

          {showAdvanced && (
            <div className="grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="SKU">
                <input value={quick.sku} onChange={(e) => setQuick((f) => ({ ...f, sku: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Njësia">
                <input value={quick.unit} onChange={(e) => setQuick((f) => ({ ...f, unit: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Kosto për njësi (€)">
                <input type="text" inputMode="decimal" value={quick.costPrice} onChange={(e) => setQuick((f) => ({ ...f, costPrice: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Limit stok të ulët">
                <input type="number" min={0} value={quick.lowStockThreshold} onChange={(e) => setQuick((f) => ({ ...f, lowStockThreshold: e.target.value }))} className={fieldCls} />
              </Field>
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Përshkrimi">
                  <input value={quick.description} onChange={(e) => setQuick((f) => ({ ...f, description: e.target.value }))} className={fieldCls} />
                </Field>
              </div>
            </div>
          )}
        </form>
      </Panel>

      <Panel title="Produktet">
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kërko sipas emrit ose SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-5 w-5" />} text="S'ka produkte. Shto një produkt për të filluar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Produkti</th>
                  <th className="px-3 py-2 font-semibold">Çmimi</th>
                  <th className="px-3 py-2 font-semibold">Stoku</th>
                  <th className="px-3 py-2 font-semibold">Shto / hiq stok</th>
                  <th className="px-3 py-2 text-right font-semibold">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">
                        {p.name}
                        {!p.isActive && (
                          <span className="ml-2 inline-block align-middle">
                            <Badge accent="gray">joaktiv</Badge>
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {[p.sku, p.unit].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-gray-800">{eur(p.salePrice)}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-800">{p.stock}</span>
                      {p.stock <= p.lowStockThreshold && <Badge accent="gray">stok i ulët</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustStock(p, -1)}
                          disabled={busyProductId === p.id || rowQty(p) > p.stock}
                          title="Hiq nga stoku (korrigjim)"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={qtyDraft[p.id] ?? '1'}
                          onChange={(e) => setQtyDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          className="h-8 w-14 rounded-lg border border-gray-200 text-center text-sm outline-none focus:border-gray-400"
                          aria-label={`Sasia për ${p.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustStock(p, 1)}
                          disabled={busyProductId === p.id}
                          title="Shto në stok"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-900 text-white transition hover:bg-gray-700 disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadHistory(p)} title="Historiku">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)} title="Ndrysho">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => remove(p)} title="Fshi">
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

      {editing && (
        <Modal title={`Ndrysho — ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emri">
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required className={fieldCls} />
              </Field>
              <Field label="SKU">
                <input value={editForm.sku} onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))} className={fieldCls} />
              </Field>
            </div>
            <Field label="Përshkrimi">
              <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Njësia">
                <input value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Çmimi i shitjes (€)">
                <input type="text" inputMode="decimal" value={editForm.salePrice} onChange={(e) => setEditForm((f) => ({ ...f, salePrice: e.target.value }))} required className={fieldCls} />
              </Field>
              <Field label="Çmimi i kostos (€)">
                <input type="text" inputMode="decimal" value={editForm.costPrice} onChange={(e) => setEditForm((f) => ({ ...f, costPrice: e.target.value }))} className={fieldCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limit stok të ulët">
                <input type="number" value={editForm.lowStockThreshold} onChange={(e) => setEditForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Aktiv">
                <select value={String(editForm.isActive)} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} className={fieldCls}>
                  <option value="true">Po</option>
                  <option value="false">Jo</option>
                </select>
              </Field>
            </div>
            <Button type="submit" className={`w-full ${primaryBtn}`}>Ruaj ndryshimet</Button>
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
                      <td className="py-2">
                        <Badge accent={m.movementType === 'in' || (m.movementType === 'adjustment' && m.quantity > 0) ? 'green' : 'gray'}>
                          {m.movementType}
                        </Badge>
                      </td>
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

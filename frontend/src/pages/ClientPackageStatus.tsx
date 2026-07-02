import { ClipboardList, Tag } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '../components/ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { shortDate, eur } from '../utils/format'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  Badge,
  RingChart,
  EmptyState,
  primaryBtn,
} from '../components/DashboardKit'

interface Package {
  id: number
  name: string
  status: 'active' | 'expired' | 'completed' | 'cancelled'
  startDate: string
  expiryDate: string
  price: number
  sessionsUsed: number
  sessionsTotal: number
  autoRenew: boolean
  type: 'monthly' | 'six_month' | 'yearly' | 'session_pack'
  shared?: boolean
  sharedClients?: number
}

interface Offer {
  id: number
  name: string
  description: string
  price: number
  originalPrice?: number
  discountLabel?: string
  highlight?: boolean
  shared?: boolean
  policeDiscount?: boolean
}

interface PackageHistoryItem {
  id: number
  name: string
  startDate: string
  expiryDate: string
  status: string
  price: number
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Aktiv'
    case 'expired': return 'Skaduar'
    case 'completed': return 'Përfunduar'
    case 'cancelled': return 'Anuluar'
    default: return status
  }
}

function statusAccent(status: string): 'green' | 'red' | 'gray' | 'orange' {
  switch (status) {
    case 'active': return 'green'
    case 'expired': return 'red'
    case 'completed': return 'gray'
    case 'cancelled': return 'orange'
    default: return 'gray'
  }
}

function packageLabel(name: string): string {
  switch (name) {
    case 'monthly': return 'Mujore'
    case 'six_month': return '6-Mujore'
    case 'yearly': return 'Vjetore'
    case 'session_pack': return 'Paketë Seancash'
    default: return name
  }
}

export default function ClientPackageStatus() {
  const { profileId } = useAuth()
  const { addNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<Package | null>(null)
  const [history, setHistory] = useState<PackageHistoryItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [renewing, setRenewing] = useState(false)

  useEffect(() => {
    if (profileId == null) return
    load()
  }, [profileId])

  const load = async () => {
    try {
      setLoading(true)
      const [c, h, o] = await Promise.all([
        api.get(`/memberships/current?clientId=${profileId}`),
        api.get(`/memberships/history?clientId=${profileId}`),
        api.get('/memberships/offers'),
      ])

      setCurrent(c.data ?? null)
      setHistory(Array.isArray(h.data) ? h.data : [])
      setOffers(Array.isArray(o.data) ? o.data : [])
    } catch {
      setCurrent(null)
      setHistory([])
      setOffers([])
      addNotification('Gabim', 'Statusi i paketës nuk u ngarkua.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const remaining = useMemo(() => {
    if (!current) return 0
    return daysUntil(current.expiryDate)
  }, [current])

  const sessionPct = useMemo(() => {
    if (!current || current.sessionsTotal === 0) return 0
    return Math.min(100, Math.round((current.sessionsUsed / current.sessionsTotal) * 100))
  }, [current])

  const toggleAutoRenew = async () => {
    if (!current) return
    try {
      await api.post(`/memberships/${current.id}/auto-renew`, { autoRenew: !current.autoRenew })
      setCurrent((prev) => prev ? { ...prev, autoRenew: !prev.autoRenew } : prev)
      addNotification('Sukses', current.autoRenew ? 'Rinovimi automatik u çaktivizua.' : 'Rinovimi automatik u aktivizua.', 'success')
    } catch {
      addNotification('Gabim', 'Ndryshimi dështoi. Provo përsëri.', 'error')
    }
  }

  const handleRenew = async () => {
    setRenewing(true)
    try {
      const res = await api.post('/memberships/renew', { currentId: current?.id })
      // Paketa aktivizohet pas pagesës (fatura pending) — jo menjëherë.
      addNotification('Sukses', res.data?.message || 'Fatura u krijua — paguaj në recepsion për aktivizim.', 'success')
    } catch {
      addNotification('Gabim', 'Rinovimi dështoi. Provo përsëri.', 'error')
    } finally {
      setRenewing(false)
    }
  }

  const selectOffer = async (offer: Offer) => {
    try {
      const res = await api.post('/memberships/upgrade', { offerId: offer.id, clientId: profileId })
      addNotification('Sukses', res.data?.message || `Kërkesa për "${packageLabel(offer.name)}" u dërgua — paguaj në recepsion.`, 'success')
    } catch {
      addNotification('Gabim', 'Kërkesa dështoi. Provo përsëri.', 'error')
    }
  }

  const countdownColor = remaining <= 3 ? 'text-red-600' : remaining <= 7 ? 'text-coral-600' : 'text-gray-900'
  const countdownBg = remaining <= 3 ? 'bg-red-50' : remaining <= 7 ? 'bg-coral-50' : 'bg-gray-50'

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Klient"
        title="Statusi i Paketës"
        subtitle={`Shiko detajet e anëtarësimit tënd, rinovimet dhe ofertat.`}
      />

      {/* Current Package */}
      <Panel title="Paketa aktuale">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : !current ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} text="Nuk ke një paketë aktive. Zgjidh një ofertë më poshtë." />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: main info */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{packageLabel(current.name)}</h3>
                  <p className="text-sm text-gray-500">
                    {current.shared && current.sharedClients ? `Paketë e përbashkët (${current.sharedClients} klientë) · ` : ''}
                    {shortDate(current.startDate)} — {shortDate(current.expiryDate)}
                  </p>
                </div>
                <Badge accent={statusAccent(current.status)}>{statusLabel(current.status)}</Badge>
              </div>

              {/* Countdown */}
              <div className={`flex items-center gap-4 rounded-2xl ${countdownBg} p-5`}>
                <div className={`font-display text-5xl font-bold tracking-tight ${countdownColor}`}>
                  {remaining}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${countdownColor}`}>
                    {remaining === 1 ? 'ditë mbetet' : 'ditë mbetën'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {remaining <= 0 ? 'Paketa ka skaduar. Rinovo për të vazhduar.' : 'për skadimin e paketës'}
                  </p>
                </div>
              </div>

              {/* Sessions progress */}
              {current.sessionsTotal > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Seanca të përdorura</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {current.sessionsUsed}/{current.sessionsTotal} seanca
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-coral-500 transition-all"
                      style={{ width: `${sessionPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {current.sessionsTotal - current.sessionsUsed} seanca të mbetura
                  </p>
                </div>
              )}

              {/* Dates & Price */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400">Data e fillimit</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{shortDate(current.startDate)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400">Data e skadimit</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{shortDate(current.expiryDate)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400">Çmimi i paguar</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{eur(current.price)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-400">Rinovim automatik</p>
                  <button
                    onClick={toggleAutoRenew}
                    className={`mt-1 inline-flex h-6 w-11 items-center rounded-full transition ${current.autoRenew ? 'bg-coral-500' : 'bg-gray-300'}`}
                    aria-label="Rinovim automatik"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${current.autoRenew ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: ring chart + renew */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-6">
              <RingChart
                value={Math.max(0, Math.min(100, (remaining / 30) * 100))}
                label={`${remaining} ditë`}
                sub="nga 30 ditë"
                size={160}
              />
              <div className="w-full space-y-2">
                <Button
                  onClick={handleRenew}
                  disabled={renewing}
                  className={`w-full ${primaryBtn}`}
                >
                  {renewing ? 'Duke dërguar…' : 'Rinovo'}
                </Button>
                <span className="inline-block w-full rounded-full bg-coral-50 px-3 py-1 text-center text-xs font-semibold text-coral-700">
                  Ofertë -15% për vjetore
                </span>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Offers */}
      <Panel title="Oferta & Rinovime">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : offers.length === 0 ? (
          <EmptyState icon={<Tag className="h-5 w-5" />} text="Nuk ka oferta aktive në këtë moment." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`flex flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
                  offer.highlight
                    ? 'border-coral-300 bg-coral-50/40'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{packageLabel(offer.name)}</h3>
                  {offer.policeDiscount && (
                    <Badge accent="teal">Policë</Badge>
                  )}
                  {offer.shared && (
                    <Badge accent="blue">Përbashkët</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{offer.description}</p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{eur(offer.price)}</span>
                  {offer.originalPrice && offer.originalPrice > offer.price && (
                    <span className="text-sm text-gray-400 line-through">{eur(offer.originalPrice)}</span>
                  )}
                </div>

                {offer.discountLabel && (
                  <span className={`mt-2 inline-block w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                    offer.highlight ? 'bg-coral-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {offer.discountLabel}
                  </span>
                )}

                <Button
                  onClick={() => selectOffer(offer)}
                  className={`mt-4 w-full ${offer.highlight ? primaryBtn : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'}`}
                >
                  Zgjidh
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* History */}
      <Panel title="Historiku i paketave">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Duke ngarkuar…</p>
        ) : history.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} text="Nuk ke historik paketash ende." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-semibold">Paketa</th>
                  <th className="px-3 py-2 font-semibold">Fillimi</th>
                  <th className="px-3 py-2 font-semibold">Skadimi</th>
                  <th className="px-3 py-2 font-semibold">Statusi</th>
                  <th className="px-3 py-2 text-right font-semibold">Çmimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{packageLabel(item.name)}</td>
                    <td className="px-3 py-3 text-gray-600">{shortDate(item.startDate)}</td>
                    <td className="px-3 py-3 text-gray-600">{shortDate(item.expiryDate)}</td>
                    <td className="px-3 py-3">
                      <Badge accent={statusAccent(item.status)}>{statusLabel(item.status)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">{eur(item.price)}</td>
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

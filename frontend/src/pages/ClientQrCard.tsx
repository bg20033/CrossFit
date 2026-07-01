import { QrCode as QrCodeIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { QrCode } from '../features/access/QrCode'
import {
  DashboardShell,
  Panel,
  Badge,
  EmptyState,
  Skeleton,
} from '../components/DashboardKit'
import { shortDate } from '../utils/format'

interface ClientProfile {
  id: number
  userId: number
  qrToken: string | null
  membershipType: string
  membershipExpiry: string | null
  isActive: boolean
  startDate: string
  trainerName?: string
  groupName?: string
}

interface MembershipPlan {
  id: number
  name: string
  durationDays: number
  sessions: number
  price: number
  isActive: boolean
}

export default function ClientQrCard() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // Try to fetch client profile + current plan
        const [profileRes, planRes] = await Promise.allSettled([
          api.get(`/clients/me`),
          api.get(`/memberships/current`),
        ])

        const p = profileRes.status === 'fulfilled' ? profileRes.value.data : null
        const pl = planRes.status === 'fulfilled' ? planRes.value.data : null

        setProfile(p)
        setPlan(pl)
      } catch (err: any) {
        setProfile(null)
        addNotification('QR nuk u ngarkua', err.response?.data?.message || 'Provo prapë pas pak.', 'error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [addNotification])

  const token = profile?.qrToken ?? ''

  const hasExpiry = Boolean(profile?.membershipExpiry)
  const daysLeft = hasExpiry
    ? Math.max(0, Math.ceil((new Date(profile!.membershipExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const expired = !profile?.isActive || (daysLeft != null && daysLeft <= 0)
  const urgent = daysLeft != null && daysLeft <= 7 && daysLeft > 0

  const copyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token).then(() => {
      addNotification('Kopjuar', 'Tokeni u kopjua.', 'success', 2000)
    })
  }

  return (
    <DashboardShell>
      

      {/* Big QR Card — phone-optimized */}
      <div className={`mx-auto max-w-md transition ${showBack ? 'hidden' : 'block'}`}>
        <div
          className={`overflow-hidden rounded-[28px] border bg-white shadow-xl shadow-gray-200/60 ${
            expired ? 'border-coral-200' : urgent ? 'border-amber-200' : 'border-gray-200'
          }`}
        >
          {/* Status accent bar */}
          <div className={`h-1.5 w-full ${expired ? 'bg-coral-500' : urgent ? 'bg-amber-400' : 'bg-[#1F9D55]'}`} />

          {/* Header strip */}
          <div className="bg-gray-900 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-display text-lg font-bold leading-tight">Stand Up CrossFit</p>
                  <p className="text-xs text-white/50">Kartela e Anëtarit</p>
                </div>
              </div>
              <button
                onClick={() => setShowBack(true)}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-gray-700"
              >
                ℹ Info
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center bg-gradient-to-b from-gray-50/80 to-white px-6 py-8">
            {loading ? (
              <Skeleton className="h-[240px] w-[240px] rounded-3xl" />
            ) : token ? (
              <>
                <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-5 shadow-sm">
                  <QrCode value={token} size={228} />
                </div>
                <button
                  onClick={copyToken}
                  className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  Kopjo tokenin
                </button>
              </>
            ) : (
              <EmptyState icon={<QrCodeIcon className="h-5 w-5" />} text="QR token nuk u gjet. Rihape faqen ose kontakto arkën." />
            )}

            {/* Status */}
            <div className="mt-6 w-full">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge accent={expired ? 'red' : urgent ? 'orange' : 'green'}>
                      {expired ? 'Skaduar' : urgent ? `${daysLeft} ditë mbeten` : hasExpiry ? 'Aktiv' : 'Aktiv pa skadim'}
                    </Badge>
                    {plan && (
                      <Badge accent="blue">{plan.name}</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-center text-sm font-medium text-gray-600">
                    {profile?.groupName ? `Grupi: ${profile.groupName}` : 'Pa grup'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Footer instruction */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-center text-xs text-gray-500">
              Mbaje këtë ekran hapur para kamerës së Arkës për skanim.
            </p>
          </div>
        </div>
      </div>

      {/* Info / back side */}
      {showBack && (
        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white">
            <div className="bg-gray-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold">Të dhëna anëtarësimi</p>
                <button
                  onClick={() => setShowBack(false)}
                  className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-gray-700"
                >
                  ← Kthehu
                </button>
              </div>
            </div>

            <div className="space-y-1 px-6 py-5">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : profile ? (
                <>
                  <InfoRow label="Emri" value={user?.name ?? '—'} />
                  <InfoRow label="Anëtarësi" value={profile.membershipType} />
                  <InfoRow label="Statusi" value={profile.isActive ? 'Aktiv' : 'Joaktiv'} />
                  <InfoRow label="Filloi" value={shortDate(profile.startDate)} />
                  <InfoRow
                    label="Skadon"
                    value={profile.membershipExpiry ? shortDate(profile.membershipExpiry) : '—'}
                  />
                  <InfoRow label="Trajneri" value={profile.trainerName ?? '—'} />
                  <InfoRow label="Grupi" value={profile.groupName ?? '—'} />
                  <InfoRow label="Tokeni" value={token} />
                </>
              ) : (
                <EmptyState icon={<QrCodeIcon className="h-5 w-5" />} text="Nuk u gjetën të dhëna." />
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <p className="text-xs text-gray-400">
                Nëse QR nuk skanohet, trego tokenin tek stafi i arkës ose përdor futjen manuale.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick help panel */}
      <Panel title="Si funksionon?" className="mx-auto max-w-md">
        <div className="space-y-4">
          <Step n={1} text="Hap këtë faqe para se të hysh në palestër." />
          <Step n={2} text="Trego QR-in tek personeli i arkës (Arka)." />
          <Step n={3} text="Skaneri lexon kodin → sistemi kontrollon pagimin, grupin dhe orarin." />
          <Step n={4} text={`Nëse gjithçka është OK, shfaqet "QASJE E LEJUAR".`} />
        </div>
      </Panel>
    </DashboardShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-3 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-50 text-xs font-bold text-coral-700">
        {n}
      </span>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  )
}

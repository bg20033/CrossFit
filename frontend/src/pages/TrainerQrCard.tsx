import { QrCode as QrCodeIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import api from '../utils/api'
import { QrCode } from '../features/access/QrCode'
import { DashboardShell, Panel, EmptyState, Skeleton } from '../components/DashboardKit'

interface TrainerProfile {
  id: number
  name: string
  email: string
  qrToken: string | null
}

export default function TrainerQrCard() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TrainerProfile | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data } = await api.get('/trainers/me')
        setProfile(data)
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

  const copyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token).then(() => {
      addNotification('Kopjuar', 'Tokeni u kopjua.', 'success', 2000)
    })
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
          <div className="h-1.5 w-full bg-[#1F9D55]" />

          <div className="bg-gray-900 px-6 py-5 text-white">
            <p className="font-display text-lg font-bold leading-tight">Stand Up CrossFit</p>
            <p className="text-xs text-white/50">Kartela e Trajnerit</p>
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
              <EmptyState icon={<QrCodeIcon className="h-5 w-5" />} text="QR token nuk u gjet. Rihape faqen." />
            )}

            <p className="mt-6 text-center text-sm font-medium text-gray-700">{user?.name ?? profile?.name}</p>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-center text-xs text-gray-500">
              Skano këtë kod te Arka për të hapur automatikisht oret e tua të planifikuara tani.
            </p>
          </div>
        </div>
      </div>

      <Panel title="Si funksionon?" className="mx-auto max-w-md">
        <div className="space-y-4">
          <Step n={1} text="Hap këtë faqe kur mbërrin në palestër." />
          <Step n={2} text="Skano QR-in te Arka, njësoj si kartela e klientëve." />
          <Step n={3} text="Sistemi gjen automatikisht grupet e tua të planifikuara tani dhe i shënon si të mbajtura (check-in)." />
          <Step n={4} text="S'ka nevojë të hapësh çdo grup manualisht te 'Grupet e mia' — skanimi e bën vetë." />
        </div>
      </Panel>
    </DashboardShell>
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

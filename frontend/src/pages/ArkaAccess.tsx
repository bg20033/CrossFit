import { Building, CheckCircle, LogOut, ScanLine, TrendingUp, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  DashboardShell,
  DashboardHeader,
  StatCard,
  Panel,
  RingChart,
  EmptyState,
} from '../components/DashboardKit'
import { Button } from '../components/ui/button'
import { useNotification } from '../contexts/NotificationContext'
import { DEFAULT_CAPACITY, type AccessVerdict } from '../features/access/accessEngine'
import { Scanner } from '../features/access/Scanner'
import api from '../utils/api'

interface LastVerdict extends AccessVerdict {
  name: string
  groupName: string
}

interface ScanLog {
  id: string
  token: string
  name: string
  decision: AccessVerdict['decision']
  reason: string
  action: AccessVerdict['action']
  groupName: string
  ts: number
}

interface ServerActive {
  id: number
  clientId: number
  name: string
  groupId: number | null
  checkInTime: string
}

interface ServerStats {
  inGymCount: number
  entriesToday: number
  denialsToday: number
  capacity: number
  active: ServerActive[]
}

const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })

function VerdictBanner({ v }: { v: LastVerdict | null }) {
  if (!v) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
        Skano një QR për të parë vendimin
      </div>
    )
  }

  const tone =
    v.decision === 'granted'
      ? 'border-transparent bg-[#1F9D55] text-white'
      : v.decision === 'exit'
        ? 'border-transparent bg-gray-900 text-white'
        : 'border-transparent bg-coral-500 text-white'
  const title = v.decision === 'granted' ? 'QASJE E LEJUAR' : v.decision === 'exit' ? 'DALJE' : 'QASJE E REFUZUAR'

  return (
    <div className={`rounded-2xl p-5 ${tone}`}>
      <div className="flex items-center justify-between">
        <p className="label-mono !text-white/60">{title}</p>
        <span className="text-2xl">{v.decision === 'granted' ? 'OK' : v.decision === 'exit' ? 'Exit' : 'X'}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">{v.name}</p>
      <p className="mt-0.5 text-sm text-white/80">{v.reason}</p>
      {v.decision !== 'denied' && <p className="mt-1 text-sm text-white/70">Grupi: {v.groupName}</p>}
    </div>
  )
}

export default function ArkaAccess() {
  const { addNotification } = useNotification()
  const [last, setLast] = useState<LastVerdict | null>(null)
  const [serverLog, setServerLog] = useState<ScanLog[]>([])
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)

  const loadLive = async () => {
    try {
      const { data } = await api.get('/access/live')
      setServerStats({
        inGymCount: Number(data.inGymCount) || 0,
        entriesToday: Number(data.entriesToday) || 0,
        denialsToday: Number(data.denialsToday) || 0,
        capacity: Number(data.capacity) || DEFAULT_CAPACITY,
        active: Array.isArray(data.active) ? data.active : [],
      })
    } catch (err: any) {
      setServerStats(null)
      addNotification('Arka', err.response?.data?.message || 'Live qasja nuk u ngarkua.', 'error')
    }
  }

  useEffect(() => {
    loadLive()
  }, [])

  const handleScan = async (token: string) => {
    try {
      const { data } = await api.post('/access/scan', { token })
      const ts = data.scannedAt ? new Date(data.scannedAt).getTime() : Date.now()
      const name = data.member?.name ?? token
      const groupName = data.group?.name ?? '-'

      setLast({
        decision: data.decision,
        action: data.action,
        reason: data.reason,
        name,
        groupName,
      })
      setServerLog((prev) => [
        {
          id: `server-${data.logId ?? crypto.randomUUID()}`,
          token: token.trim().toUpperCase(),
          name,
          decision: data.decision,
          reason: data.reason,
          action: data.action,
          groupName,
          ts,
        },
        ...prev,
      ].slice(0, 50))
      await loadLive()
    } catch (err: any) {
      addNotification('QR server', err.response?.data?.message || 'Skanimi në server dështoi.', 'error')
    }
  }

  const activeCheckIns = serverStats?.active ?? []
  const inGymCount = serverStats?.inGymCount ?? 0
  const capacity = serverStats?.capacity ?? DEFAULT_CAPACITY
  const pct = Math.round((inGymCount / capacity) * 100)
  const entriesToday = serverStats?.entriesToday ?? 0
  const denialsToday = serverStats?.denialsToday ?? 0

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Arka · Live"
        title="Kontrolli i Qasjes me QR"
        subtitle="Skano kartelën QR të klientit. Vendimi merret nga serveri me pagesë, grup dhe orar."
        right={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Kontroll serveri</span>
            <Button variant="outline" size="sm" onClick={loadLive}>
              Rifresko
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Building className="h-5 w-5" />} label="Brenda tani" value={inGymCount} sub={`nga ${capacity} vende`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Mbushja" value={`${pct}%`} sub="kapaciteti aktual" />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Hyrje sot" value={entriesToday} sub="check-in" />
        <StatCard icon={<XCircle className="h-5 w-5" />} label="Refuzime sot" value={denialsToday} sub="qasje të mohuara" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Skaneri">
              <Scanner onResult={handleScan} />
            </Panel>
            <div className="space-y-4">
              <VerdictBanner v={last} />
              <Panel title="Kapaciteti">
                <div className="flex items-center justify-center">
                  <RingChart value={pct} label={`${inGymCount}/${capacity}`} sub="brenda tani" />
                </div>
              </Panel>
            </div>
          </div>

          <Panel title="Skanimet e fundit">
            {serverLog.length === 0 ? (
              <EmptyState icon={<ScanLine className="h-5 w-5" />} text="Ende pa skanime. Skano kartelën QR të klientit." />
            ) : (
              <div className="space-y-1.5">
                {serverLog.slice(0, 8).map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                          l.decision === 'granted'
                            ? 'bg-[#E4F2EA] text-[#1F9D55]'
                            : l.decision === 'exit'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-coral-50 text-coral-700'
                        }`}
                      >
                        {l.decision === 'granted' ? 'OK' : l.decision === 'exit' ? 'Exit' : 'X'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.reason}</p>
                      </div>
                    </div>
                    <span className="nums text-xs text-gray-400">{clock(l.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={`Brenda tani · ${inGymCount}`}>
            {activeCheckIns.length === 0 ? (
              <EmptyState icon={<LogOut className="h-5 w-5" />} text="Askush brenda për momentin." />
            ) : (
              <div className="space-y-1.5">
                {activeCheckIns.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      Grupi #{c.groupId ?? '-'} · hyri {clock(new Date(c.checkInTime).getTime())}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </DashboardShell>
  )
}

import { BarChart3, Building, CalendarDays, CheckCircle, Clock, CreditCard, Flame, Hand, Handshake, RefreshCw, Sigma, Target, Users, Wallet } from 'lucide-react'
import { useEffect, useState, useMemo, ReactNode } from 'react'
import {
  DashboardShell,
  DashboardHeader,
  Panel,
  StatCard,
  Badge,
  BarList,
  WeeklyBars,
  EmptyState,
  RingChart,
} from '../components/DashboardKit'
import api from '../utils/api'

type Range = '7' | '30' | '90' | '180' | '365'

interface Tab {
  key: string
  label: string
  icon: ReactNode
}

const TABS: Tab[] = [
  { key: 'revenue', label: 'Të ardhurat', icon: <Wallet className="h-5 w-5" /> },
  { key: 'attendance', label: 'Prezenca', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'retention', label: 'Retencioni', icon: <RefreshCw className="h-5 w-5" /> },
  { key: 'groups', label: 'Skuadrat', icon: <Users className="h-5 w-5" /> },
  { key: 'expirations', label: 'Skadimet', icon: <Clock className="h-5 w-5" /> },
]

const RANGE_LABELS: Record<Range, string> = {
  '7': '7 ditë',
  '30': '30 ditë',
  '90': '3 muaj',
  '180': '6 muaj',
  '365': '1 vit',
}

/* ──────────────────── empty report fallbacks ──────────────────── */

// Palete për segmentet e donut-it të mënyrave të pagesës (rrotullohet sipas nevojës).
const PM_COLORS = ['#EE3A24', '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#6E665C']

function generateRevenueData(rangeDays: number) {
  const months = rangeDays <= 30 ? 1 : rangeDays <= 90 ? 3 : rangeDays <= 180 ? 6 : 12
  const monthLabels = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Korr', 'Gush', 'Sht', 'Tet', 'Nën', 'Dhj']
  const startIdx = 12 - months
  const labels = monthLabels.slice(startIdx)
  const monthly = labels.map((l) => ({ label: l, membership: 0, rental: 0 }))
  return {
    totalMembership: 0,
    totalRental: 0,
    monthly,
    paymentMethods: [
      { label: 'Kartelë', value: 0 },
      { label: 'Cash', value: 0 },
      { label: 'Bankë', value: 0 },
      { label: 'Online', value: 0 },
    ],
  }
}

function generateAttendanceData(rangeDays: number) {
  const days = rangeDays <= 30 ? 7 : 12
  const trends = Array.from({ length: days }, (_, i) => ({
    label: rangeDays <= 30 ? ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'][i] : `${i + 1}`,
    value: 0,
  }))
  const peakHours = [
    { label: '06:00', value: 0 },
    { label: '07:00', value: 0 },
    { label: '08:00', value: 0 },
    { label: '09:00', value: 0 },
    { label: '10:00', value: 0 },
    { label: '11:00', value: 0 },
    { label: '14:00', value: 0 },
    { label: '15:00', value: 0 },
    { label: '16:00', value: 0 },
    { label: '17:00', value: 0 },
    { label: '18:00', value: 0 },
    { label: '19:00', value: 0 },
    { label: '20:00', value: 0 },
  ]
  const weekday = [
    { label: 'E Hënë', value: 0 },
    { label: 'E Martë', value: 0 },
    { label: 'E Mërkurë', value: 0 },
    { label: 'E Enjte', value: 0 },
    { label: 'E Premte', value: 0 },
    { label: 'E Shtunë', value: 0 },
    { label: 'E Diel', value: 0 },
  ]
  const trainers = [{ label: 'Të gjithë', value: 0 }]
  return { trends, peakHours, weekday, trainers }
}

function generateRetentionData() {
  const totalClients = 0
  const activeClients = 0
  const churned = 0
  const newClients = 0
  const returning = 0
  const retentionRate = 0
  const churnRate = 0
  const cohorts = [
    { label: 'Muaj 1', value: 0 },
    { label: 'Muaj 2', value: 0 },
    { label: 'Muaj 3', value: 0 },
    { label: 'Muaj 4', value: 0 },
    { label: 'Muaj 5', value: 0 },
    { label: 'Muaj 6', value: 0 },
    { label: 'Muaj 7', value: 0 },
    { label: 'Muaj 8', value: 0 },
    { label: 'Muaj 9', value: 0 },
    { label: 'Muaj 10', value: 0 },
    { label: 'Muaj 11', value: 0 },
    { label: 'Muaj 12', value: 0 },
  ]
  return { totalClients, activeClients, churned, newClients, returning, retentionRate, churnRate, cohorts }
}

function generateGroupsData() {
  const groups: { name: string; capacity: number; booked: number; waitlist: number }[] = []
  const totalCapacity = groups.reduce((s, g) => s + g.capacity, 0)
  const totalBooked = groups.reduce((s, g) => s + g.booked, 0)
  const avgOccupancy = Math.round((totalBooked / totalCapacity) * 100)
  const totalWaitlist = groups.reduce((s, g) => s + g.waitlist, 0)
  return { groups, totalCapacity, totalBooked, avgOccupancy, totalWaitlist }
}

function generateExpirationsData() {
  const exp7 = 0
  const exp30 = 0
  const exp90 = 0
  const renewals = 0
  const conversionRate = 0
  const expiringList: { name: string; plan: string; days: number }[] = []
  return { exp7, exp30, exp90, renewals, conversionRate, expiringList }
}

/* ──────────────────── SVG helpers ──────────────────── */

function MiniBarChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const barColor = (_i: number, d: { color?: string }) => d.color || 'bg-coral-500'
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-semibold text-gray-600">{d.value}</span>
          <div
            className={`w-full max-w-[28px] rounded-t-lg ${barColor(i, d)} transition-all`}
            style={{ height: `${Math.max(4, (d.value / max) * (height - 36))}px` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[11px] font-medium text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function StackedBarChart({ data, height = 200 }: { data: { label: string; a: number; b: number }[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a + d.b]))
  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-2">
          <div className="flex h-full w-full flex-col items-center justify-end gap-0">
            <div className="w-1/2 rounded-t bg-coral-500" style={{ height: `${(d.a / max) * (height - 36)}px` }} title={`Anëtarësim: ${d.a}€`} />
            <div className="w-1/2 rounded-b bg-gray-400" style={{ height: `${(d.b / max) * (height - 36)}px` }} title={`Qira: ${d.b}€`} />
          </div>
          <span className="text-xs text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function HeatmapGrid({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((d) => {
        const intensity = d.value / max
        const alpha = Math.max(0.15, intensity)
        return (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold"
              style={{ backgroundColor: `rgba(238, 58, 36, ${alpha})`, color: intensity > 0.5 ? '#fff' : '#374151' }}
              title={`${d.label}: ${d.value}`}
            >
              {d.value}
            </div>
            <span className="text-[10px] text-gray-400">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={16} />
        {segments.map((seg) => {
          const pct = seg.value / Math.max(1, total)
          const dash = pct * c
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={16}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          )
          offset += dash
          return el
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            {seg.label} ({Math.round((seg.value / Math.max(1, total)) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────── page ──────────────────── */

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('revenue')
  const [range, setRange] = useState<Range>('30')
  const [report, setReport] = useState<any>(null)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    setReportError('')
    api.get('/reports/overview', { params: { rangeDays: Number(range) } })
      .then((res) => setReport(res.data))
      .catch((err) => {
        setReport(null)
        setReportError(err.response?.data?.message || 'Raportet nuk u ngarkuan nga DB.')
      })
  }, [range])

  const fallbackRevenue = useMemo(() => generateRevenueData(Number(range)), [range])
  const fallbackAttendance = useMemo(() => generateAttendanceData(Number(range)), [range])
  const fallbackRetention = useMemo(() => generateRetentionData(), [])
  const fallbackGroups = useMemo(() => generateGroupsData(), [])
  const fallbackExpirations = useMemo(() => generateExpirationsData(), [])
  const revenue = (report?.revenue ?? fallbackRevenue) as ReturnType<typeof generateRevenueData>
  const attendance = (report?.attendance ?? fallbackAttendance) as ReturnType<typeof generateAttendanceData>
  const retention = (report?.retention ?? fallbackRetention) as ReturnType<typeof generateRetentionData>
  const groups = (report?.groups ?? fallbackGroups) as ReturnType<typeof generateGroupsData>
  const expirations = (report?.expirations ?? fallbackExpirations) as ReturnType<typeof generateExpirationsData>

  const eur = (n: number) =>
    new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <DashboardShell>
      <DashboardHeader
        badge="Raporte"
        title="Panel i Raporteve"
        subtitle={reportError || "Analizë nga të dhënat reale të palestrës."}
        right={
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
          >
            {Object.entries(RANGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'border-coral-500 bg-coral-50 text-coral-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────── TË ARDHURAT ─────────────── */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<CreditCard className="h-5 w-5" />} label="Anëtarësimi" value={eur(revenue.totalMembership)} sub="Të ardhura nga paketat" />
            <StatCard icon={<Building className="h-5 w-5" />} label="Qira / Hapësira" value={eur(revenue.totalRental)} sub="Të ardhura nga qiratë" />
            <StatCard
              icon={<Sigma className="h-5 w-5" />}
              label="Totali"
              value={eur(revenue.totalMembership + revenue.totalRental)}
              sub="Të ardhura totale"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              title="Krahasimi mujor"
              className="lg:col-span-2"
              action={
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-coral-500" /> Anëtarësim
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" /> Qira
                  </span>
                </div>
              }
            >
              {revenue.monthly.length > 0 ? (
                <StackedBarChart data={revenue.monthly.map((m) => ({ label: m.label, a: m.membership, b: m.rental }))} />
              ) : (
                <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="S'ka të dhëna për këtë periudhë." />
              )}
            </Panel>

            <Panel title="Mënyra e pagesës">
              {/* Backend-i kthen vetëm metodat me të dhëna (numër i ndryshueshëm) —
                  segmentet ndërtohen dinamikisht, jo me indekse fikse [0..3]. */}
              <DonutChart
                segments={(revenue.paymentMethods ?? []).map((pm, i) => ({
                  label: pm.label,
                  value: pm.value,
                  color: PM_COLORS[i % PM_COLORS.length],
                }))}
              />
              <div className="mt-4 space-y-2">
                {(revenue.paymentMethods ?? []).map((pm) => (
                  <div key={pm.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-600">{pm.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{eur(pm.value)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────── PREZENCA ─────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Mesatarja ditore"
              value={Math.round(attendance.trends.reduce((s, d) => s + d.value, 0) / attendance.trends.length)}
              sub="Check-ins / ditë"
            />
            <StatCard
              icon={<Flame className="h-5 w-5" />}
              label="Pika më e ngarkuar"
              value={attendance.peakHours.reduce((max, h) => (h.value > max.value ? h : max)).label}
              sub="Ora me më shumë pjesëmarrje"
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Totali këtë periudhë"
              value={attendance.weekday.reduce((s, d) => s + d.value, 0)}
              sub="Check-ins gjithsej"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Trendi i pjesëmarrjes">
              {attendance.trends.length > 0 ? (
                <WeeklyBars data={attendance.trends} />
              ) : (
                <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="S'ka të dhëna për këtë periudhë." />
              )}
            </Panel>

            <Panel title="Ora më e ngarkuar (heatmap)">
              <HeatmapGrid
                data={attendance.peakHours.map((h) => ({
                  label: h.label,
                  value: h.value,
                }))}
              />
              <p className="mt-3 text-xs text-gray-400">Numri i check-ins për orë. Më i errët = më i ngarkuar.</p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Pjesëmarrja sipas ditëve">
              <BarList items={attendance.weekday.map((d) => ({ label: d.label, value: d.value, hint: `${d.value} check-ins` }))} />
            </Panel>

            <Panel title="Përdorimi i trajnerëve (%)">
              <BarList
                items={attendance.trainers.map((t) => ({
                  label: t.label,
                  value: t.value,
                  hint: `${t.value}%`,
                }))}
              />
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────── RETENCIONI ─────────────── */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<Handshake className="h-5 w-5" />} label="Klientë aktivë" value={retention.activeClients} sub={`nga ${retention.totalClients} total`} />
            <StatCard icon={<RefreshCw className="h-5 w-5" />} label="Shkalla e retencionit" value={`${retention.retentionRate}%`} sub="Klientë të qëndrueshëm" />
            <StatCard icon={<Hand className="h-5 w-5" />} label="Shkalla e braktisjes" value={`${retention.churnRate}%`} sub={`${retention.churned} klientë të larguar`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Retencioni i klientëve">
              <div className="flex justify-center py-4">
                <RingChart value={retention.retentionRate} label="Retencion" sub={`${retention.activeClients} / ${retention.totalClients}`} />
              </div>
            </Panel>

            <Panel title="Të rinj vs të kthyer (këtë muaj)">
              <div className="flex justify-center py-4">
                <DonutChart
                  size={160}
                  segments={[
                    { label: 'Të rinj', value: retention.newClients, color: '#EE3A24' },
                    { label: 'Të kthyer', value: retention.returning, color: '#3B82F6' },
                  ]}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Të rinj</p>
                  <p className="nums mt-1 text-xl font-bold text-gray-900">{retention.newClients}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Të kthyer</p>
                  <p className="nums mt-1 text-xl font-bold text-gray-900">{retention.returning}</p>
                </div>
              </div>
            </Panel>

            <Panel title="Braktisja">
              <div className="flex justify-center py-4">
                <RingChart value={retention.churnRate} label="Churn" sub={`${retention.churned} të larguar`} size={132} />
              </div>
              <div className="mt-2 rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Arsyet kryesore</p>
                <div className="mt-2 space-y-1.5">
                  {[
                    { label: 'Çmimi i lartë', pct: 35 },
                    { label: 'Orari i pamjaftueshëm', pct: 28 },
                    { label: 'Largim nga zona', pct: 22 },
                    { label: 'Të tjera', pct: 15 },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{r.label}</span>
                      <span className="font-semibold text-gray-900">{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Cohort retencioni (12 muaj)">
            <div className="overflow-x-auto">
              <div className="flex items-end justify-between gap-2" style={{ minWidth: 600 }}>
                {retention.cohorts.map((c) => (
                  <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-coral-500"
                      style={{ height: `${Math.max(4, (c.value / 100) * 160)}px` }}
                    />
                    <span className="text-[10px] font-medium text-gray-400">{c.label}</span>
                    <span className="text-[10px] font-semibold text-gray-600">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Përqindja e klientëve që vazhdojnë pas çdo muaji nga regjistrimi fillestar.</p>
          </Panel>
        </div>
      )}

      {/* ─────────────── SKUADRAT ─────────────── */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Mesatarja e zënies" value={`${groups.avgOccupancy}%`} sub="Përdorimi i kapacitetit" />
            <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Vende të rezervuara" value={groups.totalBooked} sub={`nga ${groups.totalCapacity} total`} />
            <StatCard icon={<Clock className="h-5 w-5" />} label="Listë pritjeje" value={groups.totalWaitlist} sub="Klientë në pritje" />
          </div>

          <Panel title="Zënia e skuadrave">
            <div className="space-y-4">
              {groups.groups.map((g) => {
                const pct = Math.round((g.booked / g.capacity) * 100)
                return (
                  <div key={g.name} className="rounded-xl border border-gray-100 px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400">
                          {g.booked}/{g.capacity} anëtarë · {g.waitlist > 0 ? `${g.waitlist} në pritje` : 'pa pritje'}
                        </p>
                      </div>
                      <Badge accent={pct >= 90 ? 'green' : 'gray'}>{pct}%</Badge>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-coral-500' : pct >= 80 ? 'bg-coral-400' : 'bg-coral-300'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Kapaciteti vs Rezervimet">
              <MiniBarChart
                data={groups.groups.map((g) => ({
                  label: g.name.split(' ')[0],
                  value: g.capacity,
                  color: 'bg-gray-300',
                }))}
              />
              <p className="mt-2 text-xs text-gray-400">Kapaciteti maksimal për grup.</p>
            </Panel>

            <Panel title="Listat e pritjes">
              {groups.groups.some((g) => g.waitlist > 0) ? (
                <div className="space-y-3">
                  {groups.groups
                    .filter((g) => g.waitlist > 0)
                    .map((g) => (
                      <div key={g.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{g.name}</p>
                          <p className="text-xs text-gray-400">Kapaciteti: {g.capacity}</p>
                        </div>
                        <span className="rounded-full bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-700">
                          {g.waitlist} në pritje
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyState icon={<CheckCircle className="h-5 w-5" />} text="S'ka lista pritjeje aktualisht." />
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────── SKADIMET ─────────────── */}
      {activeTab === 'expirations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<Clock className="h-5 w-5" />} label="Skadojnë në 7 ditë" value={expirations.exp7} sub="Urgjente — kontakto klientët" />
            <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Skadojnë në 30 ditë" value={expirations.exp30} sub="Të afërta për rinovim" />
            <StatCard icon={<RefreshCw className="h-5 w-5" />} label="Rinovimet e suksesshme" value={`${expirations.conversionRate}%`} sub={`${expirations.renewals} nga ${expirations.exp30}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Përmbledhje e skadimeve">
              <div className="space-y-4">
                {[
                  { label: '7 ditë', value: expirations.exp7, color: '#EF4444' },
                  { label: '30 ditë', value: expirations.exp30, color: '#F97316' },
                  { label: '90 ditë', value: expirations.exp90, color: '#3B82F6' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-semibold text-gray-900">{item.value} paketa</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.value / 100) * 100)}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Shkalla e konvertimit">
              <div className="flex justify-center py-4">
                <RingChart
                  value={expirations.conversionRate}
                  label="Konvertim"
                  sub={`${expirations.renewals} rinovime`}
                  size={160}
                />
              </div>
              <div className="mt-2 rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Objektivi mujor</p>
                <p className="nums mt-1 text-lg font-bold text-gray-900">75%</p>
              </div>
            </Panel>

            <Panel title="Klientët me skadim të afërt">
              <div className="space-y-3">
                {expirations.expiringList.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.plan}</p>
                    </div>
                    <Badge accent={c.days <= 7 ? 'gray' : 'gray'}>
                      {c.days <= 7 ? 'Urgjente' : `${c.days} ditë`}
                    </Badge>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

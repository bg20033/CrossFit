import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Accent is kept for call-site compatibility but the palette is fully neutral
// (white / gray / black). Direction/meaning is shown with icons & text, not color.
type Accent = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal' | 'pink' | 'gray'

/** Shared input / select styling for clean forms. */
export const fieldCls =
  'w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100'

/** Field wrapper with a label. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

/** Clean light page header with title + optional badge / action. */
export function DashboardHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: string
  subtitle?: string
  badge?: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
      <div>
        {badge && (
          <span className="mb-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 md:text-base">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap gap-3">{right}</div>}
    </div>
  )
}

/** Stat tile — neutral surface, dark value. `accent` is accepted but rendered neutral. */
export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: string
  accent?: Accent
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs font-medium text-gray-400">{sub}</p>}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl text-gray-700">
          {icon}
        </div>
      </div>
    </div>
  )
}

/** A titled content panel. */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

/** Big tappable shortcut. */
export function QuickAction({
  to,
  icon,
  label,
}: {
  to: string
  icon: ReactNode
  label: string
  accent?: Accent
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900 text-xl text-white">
        {icon}
      </span>
      <span className="font-semibold text-gray-800 group-hover:text-gray-900">{label}</span>
    </Link>
  )
}

/** Friendly placeholder when a list has no data yet. */
export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 text-center">
      <div className="mb-2 text-4xl opacity-50 grayscale">{icon}</div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

/** Small status pill. `accent` picks emphasis: green → solid dark, others → muted gray. */
export function Badge({ children, accent = 'gray' }: { children: ReactNode; accent?: Accent }) {
  const solid = accent === 'green'
  const cls = solid ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex items-center rounded-full ${cls} px-2.5 py-1 text-xs font-semibold`}>{children}</span>
}

/** Centered modal dialog. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Apple-style progress ring (donut) showing a percentage. */
export function RingChart({
  value,
  label,
  sub,
  size = 132,
}: {
  value: number
  label?: string
  sub?: string
  size?: number
}) {
  const pct = Math.max(0, Math.min(100, value))
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#111827"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text x="50%" y="50%" dy="0.1em" textAnchor="middle" className="rotate-90 fill-gray-900" style={{ transformOrigin: 'center' }} fontSize={size * 0.22} fontWeight={700}>
          {Math.round(pct)}%
        </text>
      </svg>
      {label && <p className="mt-2 text-sm font-semibold text-gray-800">{label}</p>}
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

/** Horizontal labeled bar list (neutral). */
export function BarList({ items }: { items: { label: string; value: number; hint?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{it.label}</span>
            <span className="font-medium text-gray-700">{it.hint ?? it.value}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gray-900" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Shimmer placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/70 ${className}`} />
}

/** Row of stat-card skeletons (matches the StatCard grid). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Rows of list skeletons for tables/panels. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function DashboardShell({ children }: { children: ReactNode }) {
  // Page background + padding are provided by AppLayout; this just constrains width.
  return <div className="mx-auto max-w-7xl space-y-6">{children}</div>
}

/** Neutral primary button styling (dark) for use with the shadcn Button via className. */
export const primaryBtn = 'bg-gray-900 text-white hover:bg-gray-800'

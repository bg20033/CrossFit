import { useState, useRef, useCallback } from 'react'
import { cn } from '../lib/utils'

/* ───────────────────────────────────────────────
   BodySilhouette
   ───────────────────────────────────────────────
   A tappable SVG body diagram for the StandUp CrossFit
   gym-management app.  Front and back views with
   Albanian labels, measurements, trainer notes and
   trend indicators.
   ─────────────────────────────────────────────── */

export type Trend = 'up' | 'down' | 'stable'

export interface BodyMeasurement {
  value: number
  unit: string
  notes?: string
  trend?: Trend
}

export interface BodySilhouetteProps {
  measurements?: Record<string, BodyMeasurement>
  onRegionClick?: (region: string) => void
  activeRegion?: string | null
}

/* ─── Region metadata ─── */

interface RegionMeta {
  id: string
  label: string
  frontPath?: string
  backPath?: string
}

const REGIONS: RegionMeta[] = [
  {
    id: 'head-shoulders',
    label: 'Shpatullat',
    frontPath:
      'M90,28 C90,12 104,2 120,2 C136,2 150,12 150,28 C150,36 146,42 140,45 L140,52 L130,52 L130,58 L110,58 L110,52 L100,52 L100,45 C94,42 90,36 90,28 Z',
  },
  {
    id: 'chest',
    label: 'Kraharori',
    frontPath:
      'M100,58 L140,58 L145,62 L150,90 L145,105 L95,105 L90,90 L95,62 Z',
  },
  {
    id: 'arms',
    label: 'Krahët',
    frontPath:
      'M60,60 L95,62 L90,90 L95,105 L85,130 L80,155 L65,155 L70,130 L75,105 L70,90 L60,75 Z M145,62 L180,60 L190,75 L180,90 L175,105 L180,130 L185,155 L170,155 L165,130 L155,105 L160,90 L155,62 Z',
  },
  {
    id: 'waist',
    label: 'Beli',
    frontPath:
      'M95,105 L145,105 L148,120 L150,140 L145,155 L95,155 L90,140 L92,120 Z',
    backPath:
      'M95,105 L145,105 L148,120 L150,140 L145,155 L95,155 L90,140 L92,120 Z',
  },
  {
    id: 'hips',
    label: 'Ijet',
    frontPath:
      'M95,155 L145,155 L152,170 L155,190 L145,200 L95,200 L85,190 L88,170 Z',
    backPath:
      'M95,155 L145,155 L152,170 L155,190 L145,200 L95,200 L85,190 L88,170 Z',
  },
  {
    id: 'thighs',
    label: 'Këmbët',
    frontPath:
      'M95,200 L120,200 L120,270 L115,300 L100,300 L95,270 L95,200 Z M120,200 L145,200 L145,270 L140,300 L125,300 L120,270 L120,200 Z',
    backPath:
      'M95,200 L120,200 L120,270 L115,300 L100,300 L95,270 L95,200 Z M120,200 L145,200 L145,270 L140,300 L125,300 L120,270 L120,200 Z',
  },
  {
    id: 'calves',
    label: 'Kërcëllat',
    frontPath:
      'M100,300 L115,300 L118,330 L116,370 L110,380 L102,370 L100,330 Z M125,300 L140,300 L142,330 L140,370 L134,380 L128,370 L126,330 Z',
    backPath:
      'M100,300 L115,300 L118,330 L116,370 L110,380 L102,370 L100,330 Z M125,300 L140,300 L142,330 L140,370 L134,380 L128,370 L126,330 Z',
  },
  {
    id: 'back',
    label: 'Shpina',
    backPath:
      'M95,58 L145,58 L150,90 L145,105 L95,105 L90,90 Z',
  },
]

/* ─── Helpers ─── */

function trendSymbol(t?: Trend) {
  if (t === 'up') return '▲'
  if (t === 'down') return '▼'
  return '—'
}

function trendClass(t?: Trend) {
  if (t === 'up') return 'text-emerald-600'
  if (t === 'down') return 'text-coral-500'
  return 'text-gray-400'
}

/* ─── Component ─── */

export default function BodySilhouette({
  measurements = {},
  onRegionClick,
  activeRegion: controlledActive,
}: BodySilhouetteProps) {
  const [internalActive, setInternalActive] = useState<string | null>(null)
  const active = controlledActive ?? internalActive
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const handleClick = useCallback(
    (id: string) => {
      if (controlledActive === undefined) {
        setInternalActive((prev) => (prev === id ? null : id))
      }
      onRegionClick?.(id)
    },
    [controlledActive, onRegionClick]
  )

  const renderRegion = (
    r: RegionMeta,
    view: 'front' | 'back',
    offsetX: number
  ) => {
    const path = view === 'front' ? r.frontPath : r.backPath
    if (!path) return null

    const isActive = active === r.id
    const isHover = hovered === r.id
    const hasData = !!measurements[r.id]

    return (
      <g
        key={`${view}-${r.id}`}
        onClick={() => handleClick(r.id)}
        onMouseEnter={() => setHovered(r.id)}
        onMouseLeave={() => setHovered(null)}
        className="cursor-pointer transition-opacity duration-200"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        <path
          d={path}
          className={cn(
            'transition-colors duration-200',
            isActive
              ? 'fill-coral-500/30 stroke-coral-500'
              : isHover
                ? 'fill-gray-400/20 stroke-coral-500/70'
                : hasData
                  ? 'fill-gray-400/10 stroke-gray-400'
                  : 'fill-gray-400/5 stroke-gray-300'
          )}
          strokeWidth={isActive ? 2.5 : isHover ? 2 : 1}
          strokeLinejoin="round"
        />
        {/* Measurement dot indicator */}
        {hasData && (
          <circle
            cx={
              view === 'front'
                ? r.id === 'arms'
                  ? 60
                  : r.id === 'head-shoulders'
                    ? 120
                    : r.id === 'chest'
                      ? 120
                      : 120
                : 120
            }
            cy={
              view === 'front'
                ? r.id === 'head-shoulders'
                  ? 28
                  : r.id === 'chest'
                    ? 80
                    : r.id === 'arms'
                      ? 110
                      : r.id === 'waist'
                        ? 130
                        : r.id === 'hips'
                          ? 175
                          : r.id === 'thighs'
                            ? 250
                            : 340
                : r.id === 'back'
                  ? 80
                  : r.id === 'waist'
                    ? 130
                    : r.id === 'hips'
                      ? 175
                      : r.id === 'thighs'
                        ? 250
                        : 340
            }
            r={4}
            className="fill-coral-500"
          />
        )}
      </g>
    )
  }

  const activeMeta = REGIONS.find((r) => r.id === active)
  const activeData = active ? measurements[active] : undefined

  return (
    <div className="w-full">
      {/* ─── SVG diagram ─── */}
      <div className="flex justify-center overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox="0 0 500 400"
          className="w-full max-w-[560px] h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background guides */}
          <rect x="0" y="0" width="500" height="400" className="fill-none" />

          {/* Front view label */}
          <text
            x="120"
            y="395"
            textAnchor="middle"
            className="fill-gray-400 text-[10px] uppercase tracking-wider font-display"
          >
            Para
          </text>

          {/* Back view label */}
          <text
            x="380"
            y="395"
            textAnchor="middle"
            className="fill-gray-400 text-[10px] uppercase tracking-wider font-display"
          >
            Prapa
          </text>

          {/* Vertical separator */}
          <line
            x1="250"
            y1="10"
            x2="250"
            y2="380"
            className="stroke-gray-200"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* ─── Front view ─── */}
          {REGIONS.map((r) => renderRegion(r, 'front', 0))}

          {/* ─── Back view ─── */}
          {REGIONS.map((r) => renderRegion(r, 'back', 260))}

          {/* Side labels (mobile hint) */}
          <text
            x="5"
            y="200"
            textAnchor="start"
            className="fill-gray-300 text-[9px] uppercase tracking-wider font-display"
            style={{ writingMode: 'vertical-rl' }}
          >
            Para
          </text>
          <text
            x="495"
            y="200"
            textAnchor="end"
            className="fill-gray-300 text-[9px] uppercase tracking-wider font-display"
            style={{ writingMode: 'vertical-rl' }}
          >
            Prapa
          </text>
        </svg>
      </div>

      {/* ─── Region legend / quick select (mobile friendly) ─── */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {REGIONS.map((r) => {
          const hasData = !!measurements[r.id]
          const isActive = active === r.id
          return (
            <button
              key={r.id}
              onClick={() => handleClick(r.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                isActive
                  ? 'bg-coral-500 text-white border-coral-500'
                  : hasData
                    ? 'bg-surface-alt text-ink border-gray-200 hover:border-coral-500/50'
                    : 'bg-surface-alt text-ink-soft border-gray-200 hover:border-coral-500/50'
              )}
            >
              {r.label}
              {hasData && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-coral-500 align-middle" />
              )}
            </button>
          )
        })}
      </div>

      {/* ─── Detail panel ─── */}
      {activeMeta && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-surface p-4 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              {activeMeta.label}
            </h3>
            <button
              onClick={() =>
                controlledActive === undefined
                  ? setInternalActive(null)
                  : onRegionClick?.('')
              }
              className="text-gray-400 hover:text-ink text-lg leading-none"
              aria-label="Mbyll"
            >
              ×
            </button>
          </div>

          {activeData ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-ink tracking-tightest">
                  {activeData.value}
                  <span className="text-sm font-normal text-ink-soft ml-1">
                    {activeData.unit}
                  </span>
                </span>
                {activeData.trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-sm font-medium',
                      trendClass(activeData.trend)
                    )}
                  >
                    {trendSymbol(activeData.trend)}
                    <span className="text-xs capitalize">
                      {activeData.trend === 'up'
                        ? 'Rritje'
                        : activeData.trend === 'down'
                          ? 'Zbritje'
                          : 'I njëjti'}
                    </span>
                  </span>
                )}
              </div>

              {activeData.notes && (
                <div className="rounded-lg bg-canvas p-3 text-sm text-ink-soft leading-relaxed">
                  <span className="text-xs font-medium text-ink-faint uppercase tracking-wider block mb-1">
                    Shënime nga trajneri
                  </span>
                  {activeData.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Nuk ka matje të regjistruara për këtë zonë.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

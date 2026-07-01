import { useState, useMemo } from 'react'
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter'

/* ─────────────────────────────────────────────────────────
   MuscleBodyMap
   Wrapper për react-muscle-highlighter me etiketa shqip,
   design tokens (coral accent), dhe panel matjesh.
   ───────────────────────────────────────────────────────── */

export type Trend = 'up' | 'down' | 'stable'

export interface MuscleMeasurement {
  value: number
  unit: string
  notes?: string
  trend?: Trend
}

export type MeasurementRegion =
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arms'
  | 'thighs'
  | 'calves'
  | 'shoulders'
  | 'back'

interface Props {
  /** Matjet e trajnerit për zona të caktuara. */
  measurements?: Partial<Record<MeasurementRegion, MuscleMeasurement>>
  /** Thirret kur klikohet një muskul. */
  onRegionClick?: (region: MeasurementRegion) => void
  /** Zona aktive (e highlight-uara). */
  activeRegion?: MeasurementRegion | null
  /** Gjinia — ndikon siluetën. */
  gender?: 'male' | 'female'
  /** Shfaq të dyja pamjet (front + back). */
  showBothSides?: boolean
}

// Map measurement regions → muscle slugs (what the library uses)
const REGION_TO_SLUGS: Record<MeasurementRegion, Slug[]> = {
  chest: ['chest'],
  waist: ['abs', 'obliques'],
  hips: ['gluteal'],
  arms: ['biceps', 'triceps', 'forearm'],
  thighs: ['quadriceps', 'hamstring', 'adductors'],
  calves: ['calves', 'tibialis'],
  shoulders: ['deltoids', 'trapezius'],
  back: ['upper-back', 'lower-back', 'trapezius'],
}

// Albanian labels for the UI
const REGION_LABELS: Record<MeasurementRegion, string> = {
  chest: 'Kraharori',
  waist: 'Beli',
  hips: 'Ijet',
  arms: 'Krahët',
  thighs: 'Këmbët (sipërme)',
  calves: 'Kërcëllat',
  shoulders: 'Shpatullat',
  back: 'Shpina',
}

// Trend arrows
function TrendArrow({ trend }: { trend?: Trend }) {
  if (trend === 'up') return <span className="text-emerald-600">▲</span>
  if (trend === 'down') return <span className="text-coral-600">▼</span>
  return <span className="text-gray-400">—</span>
}

export default function MuscleBodyMap({
  measurements = {},
  onRegionClick,
  activeRegion,
  gender = 'male',
  showBothSides = true,
}: Props) {
  const [selected, setSelected] = useState<MeasurementRegion | null>(activeRegion ?? null)
  const [side, setSide] = useState<'front' | 'back'>('front')

  // Build data array for the library: highlight muscles that have measurements
  const bodyData: ExtendedBodyPart[] = useMemo(() => {
    const parts: ExtendedBodyPart[] = []
    ;(Object.keys(REGION_TO_SLUGS) as MeasurementRegion[]).forEach((region) => {
      const hasMeasurement = measurements[region] !== undefined
      const isSelected = selected === region
      const slugs = REGION_TO_SLUGS[region]

      slugs.forEach((slug) => {
        parts.push({
          slug,
          color: isSelected ? '#EE3A24' : hasMeasurement ? '#FBE3DD' : undefined,
          intensity: isSelected ? 2 : hasMeasurement ? 1 : undefined,
          styles: isSelected
            ? { fill: '#EE3A24', stroke: '#B03A26', strokeWidth: 2 }
            : hasMeasurement
            ? { fill: '#FBE3DD', stroke: '#EE3A24', strokeWidth: 1 }
            : undefined,
        })
      })
    })
    return parts
  }, [measurements, selected])

  const handlePress = (part: ExtendedBodyPart) => {
    // Find which region this slug belongs to
    const region = (Object.keys(REGION_TO_SLUGS) as MeasurementRegion[]).find((r) =>
      REGION_TO_SLUGS[r].includes(part.slug as Slug)
    )
    if (region) {
      setSelected(region)
      onRegionClick?.(region)
    }
  }

  const selectedMeasurement = selected ? measurements[selected] : undefined
  const renderBodyView = (view: 'front' | 'back', scale = 1.05) => (
    <div className="relative flex w-full justify-center overflow-hidden rounded-xl border border-gray-100 bg-white p-3">
      <p className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {view === 'front' ? 'Përpara' : 'Prapa'}
      </p>
      <div className="max-w-full">
        <Body
          data={bodyData}
          side={view}
          gender={gender}
          scale={scale}
          onBodyPartPress={handlePress}
          defaultFill="#ECE8E0"
          defaultStroke="none"
          border="none"
          colors={['#FBE3DD', '#EE3A24']}
        />
      </div>
    </div>
  )

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-5 lg:flex-row lg:items-start">
      {/* Body views */}
      <div className="flex w-full min-w-0 flex-col items-center gap-4 lg:flex-1">
        <div className="w-full min-w-0 lg:hidden">
          {renderBodyView(showBothSides ? side : 'front', 1.05)}
        </div>

        <div className="hidden w-full min-w-0 items-start justify-center gap-4 lg:flex">
          <div className="w-full max-w-[17rem]">{renderBodyView('front', 1.2)}</div>
          {showBothSides && <div className="w-full max-w-[17rem]">{renderBodyView('back', 1.2)}</div>}
        </div>

        {/* Side toggle (mobile-friendly) */}
        {showBothSides && <div className="flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSide('front')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              side === 'front' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 '
            }`}
          >
            Përpara
          </button>
          <button
            type="button"
            onClick={() => setSide('back')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              side === 'back' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Prapa
          </button>
        </div>}
      </div>

      {/* Detail panel */}
      <div className="w-full min-w-0 lg:max-w-xs lg:flex-1">
        {selected && selectedMeasurement ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-gray-900">
                {REGION_LABELS[selected]}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-500">Matja</span>
                <span className="font-display text-xl font-bold text-gray-900">
                  {selectedMeasurement.value} {selectedMeasurement.unit}
                </span>
              </div>

              {selectedMeasurement.trend && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-500">Trendi</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    <TrendArrow trend={selectedMeasurement.trend} />
                    {selectedMeasurement.trend === 'up'
                      ? 'Rritje'
                      : selectedMeasurement.trend === 'down'
                      ? 'Zbritje'
                      : 'I njëjti'}
                  </span>
                </div>
              )}

              {selectedMeasurement.notes && (
                <div className="rounded-xl bg-coral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-coral-700">Shënime trajneri</p>
                  <p className="mt-1 text-sm text-coral-900">{selectedMeasurement.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-700">Kliko një muskul</p>
            <p className="mt-1 text-xs text-gray-400">
              Për të shfaqur matjet e fundit për çdo pjesë të trupit.
            </p>
            <div className="mt-4 space-y-2">
              {(Object.keys(REGION_LABELS) as MeasurementRegion[]).map((region) => {
                const m = measurements[region]
                return (
                  <button
                    key={region}
                    onClick={() => setSelected(region)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                      selected === region
                        ? 'border border-coral-200 bg-coral-50 text-coral-900'
                        : 'border border-gray-100 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{REGION_LABELS[region]}</span>
                    {m ? (
                      <span className="font-semibold">
                        {m.value} {m.unit}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

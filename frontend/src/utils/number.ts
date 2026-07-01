/**
 * Locale-tolerant number parsing.
 *
 * Albanian/Kosovo keyboards type a comma as the decimal separator ("75,5").
 * Native `parseFloat("75,5")` returns 75 (it stops at the comma) and
 * `<input type="number">` often drops the value entirely — both silently
 * corrupt money and measurement entry. Use these helpers for any decimal field,
 * paired with `type="text" inputMode="decimal"` on the input.
 */

// Returns the parsed number, or null when blank/invalid.
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const v = String(value).trim().replace(',', '.')
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Returns the parsed number, or `fallback` (default 0) when blank/invalid —
// for required fields that must send a concrete number.
export function toDecimal(value: string | number | null | undefined, fallback = 0): number {
  return parseDecimal(value) ?? fallback
}

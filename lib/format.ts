const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const NOT_MEASURED = 'Not measured'

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Not set'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function fmtDateShort(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function fmtDateTime(iso: string): string {
  const [date, time] = iso.split('T')
  return `${fmtDateShort(date)}, ${(time ?? '').slice(0, 5)}`
}

/** Null renders as "Not measured" — never as zero. */
export function fmtVal(v: number | null | undefined, unit = '', digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NOT_MEASURED
  const s = v.toFixed(digits)
  return unit ? `${s} ${unit}` : s
}

export function initials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function mean(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function uniqueSorted<T extends string | number>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : (pluralWord ?? word + 's')}`
}

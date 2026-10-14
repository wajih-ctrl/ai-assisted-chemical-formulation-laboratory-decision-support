import type { CrudeSample, Experiment, GasolineExperiment } from './types'
import { mean } from './format'

/** Experiments whose recorded water separation can be plotted. */
export function hasResult(e: Experiment): boolean {
  return e.waterSepPct !== null && (e.status === 'Completed' || e.status === 'Under Review')
}

export function hasRon(e: GasolineExperiment): boolean {
  return e.ron !== null && e.boosterPpm !== null && (e.status === 'Completed' || e.status === 'Under Review')
}

export interface ReferenceConditions {
  crudeId: string | 'all'
  tempC: number
  settlingMin: number
}

export function mismatchReasons(e: Experiment, ref: ReferenceConditions): string[] {
  const out: string[] = []
  if (ref.crudeId !== 'all' && e.crudeId !== ref.crudeId) out.push(`crude ${e.crudeId} vs ${ref.crudeId}`)
  if (e.tempC !== ref.tempC) out.push(`${e.tempC ?? 'n/a'} °C vs ${ref.tempC} °C`)
  if (e.settlingMin !== ref.settlingMin) out.push(`${e.settlingMin ?? 'n/a'} min vs ${ref.settlingMin} min`)
  return out
}

export interface DosePoint {
  x: number
  y: number
  id: string
  formulationId: string
  exp: Experiment
  mismatch: string[]
}

export interface DoseSeries {
  formulationId: string
  points: DosePoint[]
  /** Mean of matched replicates per dosage level (connects measured levels only). */
  means: { x: number; y: number; n: number }[]
}

export function buildDoseSeries(
  exps: Experiment[],
  formulationIds: string[],
  ref: ReferenceConditions,
  matchedOnly: boolean,
): DoseSeries[] {
  return formulationIds.map((fid) => {
    const all = exps
      .filter((e) => e.formulationId === fid && hasResult(e) && e.dosagePpm !== null)
      .map<DosePoint>((e) => ({
        x: e.dosagePpm as number,
        y: e.waterSepPct as number,
        id: e.id,
        formulationId: fid,
        exp: e,
        mismatch: mismatchReasons(e, ref),
      }))
    const points = matchedOnly ? all.filter((p) => p.mismatch.length === 0) : all
    const byDose = new Map<number, number[]>()
    points
      .filter((p) => p.mismatch.length === 0)
      .forEach((p) => byDose.set(p.x, [...(byDose.get(p.x) ?? []), p.y]))
    const means = Array.from(byDose.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, ys]) => ({ x, y: mean(ys) as number, n: ys.length }))
    return { formulationId: fid, points, means }
  })
}

export interface SweepFixed {
  crudeId: string
  dosagePpm: number
  tempC: number
  settlingMin: number
}

/**
 * Series of recorded separation against one varied condition (settling time or temperature),
 * holding crude and dosage fixed. The remaining condition is flagged when it differs from the reference.
 */
export function buildSweepSeries(
  exps: Experiment[],
  formulationIds: string[],
  sweep: 'settlingMin' | 'tempC',
  fixed: SweepFixed,
  matchedOnly: boolean,
): DoseSeries[] {
  const other = sweep === 'settlingMin' ? 'tempC' : 'settlingMin'
  const otherLabel = other === 'tempC' ? '°C' : 'min'
  return formulationIds.map((fid) => {
    const all = exps
      .filter(
        (e) =>
          e.formulationId === fid &&
          hasResult(e) &&
          e.crudeId === fixed.crudeId &&
          e.dosagePpm === fixed.dosagePpm &&
          e[sweep] !== null,
      )
      .map<DosePoint>((e) => {
        const mismatch: string[] = []
        if (e[other] !== fixed[other]) mismatch.push(`${e[other] ?? 'n/a'} ${otherLabel} vs ${fixed[other]} ${otherLabel}`)
        return { x: e[sweep] as number, y: e.waterSepPct as number, id: e.id, formulationId: fid, exp: e, mismatch }
      })
    const points = matchedOnly ? all.filter((p) => p.mismatch.length === 0) : all
    const byX = new Map<number, number[]>()
    points.filter((p) => p.mismatch.length === 0).forEach((p) => byX.set(p.x, [...(byX.get(p.x) ?? []), p.y]))
    const means = Array.from(byX.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, ys]) => ({ x, y: mean(ys) as number, n: ys.length }))
    return { formulationId: fid, points, means }
  })
}

export interface ConditionDiff {
  variable: string
  values: string[]
}

export function conditionDiffs(exps: Experiment[]): ConditionDiff[] {
  const diffs: ConditionDiff[] = []
  const check = (variable: string, getter: (e: Experiment) => string) => {
    const vals = Array.from(new Set(exps.map(getter)))
    if (vals.length > 1) diffs.push({ variable, values: vals })
  }
  check('Crude sample', (e) => e.crudeId)
  check('Temperature', (e) => (e.tempC === null ? 'Not recorded' : `${e.tempC} °C`))
  check('Settling time', (e) => (e.settlingMin === null ? 'Not recorded' : `${e.settlingMin} min`))
  check('Mixing conditions', (e) => e.mixing)
  return diffs
}

export interface RepeatGroup {
  key: string
  formulationId: string
  crudeId: string
  dosagePpm: number
  tempC: number
  settlingMin: number
  experiments: Experiment[]
  min: number
  max: number
  mean: number
}

export function repeatGroups(exps: Experiment[]): RepeatGroup[] {
  const map = new Map<string, Experiment[]>()
  exps
    .filter((e) => hasResult(e) && e.dosagePpm !== null && e.tempC !== null && e.settlingMin !== null)
    .forEach((e) => {
      const key = [e.formulationId, e.crudeId, e.dosagePpm, e.tempC, e.settlingMin].join('|')
      map.set(key, [...(map.get(key) ?? []), e])
    })
  return Array.from(map.entries())
    .map(([key, list]) => {
      const seps = list.map((e) => e.waterSepPct as number)
      return {
        key,
        formulationId: list[0].formulationId,
        crudeId: list[0].crudeId,
        dosagePpm: list[0].dosagePpm as number,
        tempC: list[0].tempC as number,
        settlingMin: list[0].settlingMin as number,
        experiments: list,
        min: Math.min(...seps),
        max: Math.max(...seps),
        mean: mean(seps) as number,
      }
    })
    .sort((a, b) => b.experiments.length - a.experiments.length || a.formulationId.localeCompare(b.formulationId))
}

export interface CoverageCell {
  dose: number
  temp: number
  experiments: Experiment[]
}

export function coverageMatrix(
  exps: Experiment[],
  formulationId: string,
  crudeId: string,
  settlingMin: number,
  doses: number[],
  temps: number[],
): CoverageCell[][] {
  return doses.map((dose) =>
    temps.map((temp) => ({
      dose,
      temp,
      experiments: exps.filter(
        (e) =>
          e.formulationId === formulationId &&
          e.crudeId === crudeId &&
          e.settlingMin === settlingMin &&
          e.dosagePpm === dose &&
          e.tempC === temp &&
          (e.status === 'Completed' || e.status === 'Under Review' || e.status === 'In Progress' || e.status === 'Pending' || e.status === 'Planned'),
      ),
    })),
  )
}

export function distinctValues(exps: Experiment[], key: 'dosagePpm' | 'tempC' | 'settlingMin'): number[] {
  return Array.from(new Set(exps.map((e) => e[key]).filter((v): v is number => v !== null))).sort((a, b) => a - b)
}

export function crudeLabel(crudes: CrudeSample[], id: string): string {
  const c = crudes.find((x) => x.id === id)
  return c ? `${c.id} · ${c.name}` : id
}

export function statusTone(status: string): 'teal' | 'blue' | 'amber' | 'rust' | 'slate' | 'green' {
  switch (status) {
    case 'Completed':
      return 'green'
    case 'In Progress':
      return 'blue'
    case 'Under Review':
    case 'Approved for Testing':
      return 'teal'
    case 'Pending':
    case 'Scheduled':
    case 'Proposed':
      return 'amber'
    case 'Planned':
      return 'blue'
    case 'Cancelled':
    case 'Rejected':
      return 'rust'
    default:
      return 'slate'
  }
}

export function nextExperimentId(existing: string[], prefix: 'DEM' | 'GAS'): string {
  const max = existing
    .filter((id) => id.startsWith(prefix + '-'))
    .map((id) => parseInt(id.split('-')[1], 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export function nextId(existing: string[], prefix: string, pad = 3): string {
  const max = existing
    .filter((id) => id.startsWith(prefix + '-'))
    .map((id) => parseInt(id.slice(prefix.length + 1), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`
}

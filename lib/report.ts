import type {
  AnalyticalInsight,
  CrudeSample,
  Experiment,
  Formulation,
  GasolineBlend,
  GasolineExperiment,
  HistoricalDataset,
  Recommendation,
  ReportConfig,
  ReportItem,
  TestingPlanItem,
  User,
  WorkflowId,
} from './types'
import type { AppState } from './store'
import { buildDoseSeries, conditionDiffs, hasRon, hasResult, type DoseSeries, type ReferenceConditions } from './analysis'
import { fmtDate, fmtVal, mean, uniqueSorted } from './format'
import { TODAY_ISO } from './seed'

export const REPORT_LABEL = 'Illustrative Laboratory Analysis — Not Scientifically Validated.'

export const REPORT_NOTICE =
  'All data in this report is illustrative, seeded or user-entered inside a local prototype. No measurement has been scientifically validated, and no result should be used for product, process or field decisions without independent laboratory confirmation.'

export const REPORT_DISCLAIMER = [
  'This document was generated inside a prototype from illustrative data. It does not represent real laboratory measurements, certified test methods or validated performance claims.',
  'Observed relationships between dosage and response describe recorded points only. They are not a fitted model and do not predict behaviour at untested conditions, on other crude or fuel samples, or at field scale.',
  'Differences between formulations are only meaningful where crude sample, temperature, settling time, mixing and measurement method are matched. Points recorded under different conditions are flagged and should not be pooled.',
  'Proposed experiments are suggestions for chemist review. They are not predictions of the outcome of those experiments.',
]

export interface TableData {
  head: string[]
  rows: string[][]
}

export interface GroupRow {
  key: string
  label: string
  sub: string
  color: string
  description: string
  tests: number
  withResults: number
  meanValue: number | null
  min: number | null
  max: number | null
}

export interface ObservationRow {
  id: string
  title: string
  body: string
  refs: string[]
}

export interface RefRow {
  id: string
  summary: string
  result: string
  citedBy: string
  inScope: boolean
}

export interface RecommendationRow {
  rec: Recommendation
  plan: TestingPlanItem | null
  assignee: User | null
}

export interface GasPoint {
  x: number
  y: number
  id: string
}
export interface GasSeries {
  key: string
  label: string
  color: string
  points: GasPoint[]
}

export interface ReportData {
  config: ReportConfig
  workflow: WorkflowId
  title: string
  reportId: string
  generatedOn: string
  authorName: string
  empty: boolean
  datasetTable: TableData
  overview: { label: string; value: string }[]
  experimentTable: TableData
  groupTitle: string
  groups: GroupRow[]
  groupUnit: string
  conditionTable: TableData
  conditionWarnings: string[]
  crudes: CrudeSample[]
  blends: GasolineBlend[]
  demSeries: DoseSeries[]
  gasSeries: GasSeries[]
  refConditions: ReferenceConditions | null
  insights: AnalyticalInsight[]
  observations: ObservationRow[]
  references: RefRow[]
  recommendations: RecommendationRow[]
  rejectedCount: number
  reportItems: ReportItem[]
  notes: string
  validation: string[]
  chartCaption: string
}

export function formulationsForWorkflow(state: AppState, wf: WorkflowId): Formulation[] {
  const catIds = new Set(state.categories.filter((c) => c.workflow === wf).map((c) => c.id))
  return state.formulations.filter((f) => catIds.has(f.categoryId))
}

export function defaultTitle(wf: WorkflowId, formulationIds: string[], scopeIds: string[]): string {
  if (wf === 'gasoline') {
    const add = formulationIds.length ? formulationIds.join(' and ') : 'octane boosters'
    const blends = scopeIds.length ? ` on ${scopeIds.join(', ')}` : ''
    return `Gasoline Blend Screening Review: ${add}${blends}`
  }
  const f = formulationIds.length ? formulationIds.join(' and ') : 'demulsifier formulations'
  const c = scopeIds.length ? ` on ${scopeIds.join(', ')}` : ''
  return `Demulsifier Bottle-Test Review: ${f}${c}`
}

function mode<T extends string | number>(values: T[]): T | null {
  if (!values.length) return null
  const counts = new Map<T, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

function inRange(date: string, from: string, to: string): boolean {
  const d = date.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

function minMax(nums: number[]): { min: number | null; max: number | null } {
  return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : { min: null, max: null }
}

export function buildReport(state: AppState, config: ReportConfig, authorName: string): ReportData {
  const wf = config.workflow
  const allForms = formulationsForWorkflow(state, wf)
  const selForms = config.formulationIds.length ? allForms.filter((f) => config.formulationIds.includes(f.id)) : allForms
  const selFormIds = new Set(selForms.map((f) => f.id))

  const datasets: HistoricalDataset[] = state.datasets.filter(
    (d) => d.workflow === wf && (config.datasetId === 'all' || d.id === config.datasetId),
  )

  const demExps: Experiment[] =
    wf === 'demulsifier'
      ? state.experiments.filter(
          (e) =>
            e.status !== 'Cancelled' &&
            selFormIds.has(e.formulationId) &&
            (config.crudeIds.length === 0 || config.crudeIds.includes(e.crudeId)) &&
            (config.datasetId === 'all' || e.datasetId === config.datasetId) &&
            inRange(e.testDate, config.dateFrom, config.dateTo),
        )
      : []
  const gasExps: GasolineExperiment[] =
    wf === 'gasoline'
      ? state.gasoline.filter(
          (e) =>
            e.status !== 'Cancelled' &&
            selFormIds.has(e.additiveType) &&
            (config.crudeIds.length === 0 || config.crudeIds.includes(e.blendId)) &&
            (config.datasetId === 'all' || e.datasetId === config.datasetId) &&
            inRange(e.testDate, config.dateFrom, config.dateTo),
        )
      : []

  demExps.sort((a, b) => a.id.localeCompare(b.id))
  gasExps.sort((a, b) => a.id.localeCompare(b.id))

  const demResults = demExps.filter(hasResult)
  const gasResults = gasExps.filter(hasRon)
  const total = demExps.length + gasExps.length
  const withResults = demResults.length + gasResults.length

  const dates = [...demExps.map((e) => e.testDate), ...gasExps.map((e) => e.testDate)].map((d) => d.slice(0, 10)).sort()
  const userName = (id: string) => state.users.find((u) => u.id === id)?.name ?? id

  const datasetTable: TableData = {
    head: ['Dataset', 'Source file', 'Imported', 'Stored rows', 'Records in report'],
    rows: datasets.map((d) => [
      `${d.id}  ${d.name}`,
      d.source,
      fmtDate(d.importedAt),
      String(d.rows),
      String([...demExps, ...gasExps].filter((e) => e.datasetId === d.id).length),
    ]),
  }

  const statusCounts = new Map<string, number>()
  ;[...demExps, ...gasExps].forEach((e) => statusCounts.set(e.status, (statusCounts.get(e.status) ?? 0) + 1))

  const overview = [
    { label: 'Workflow', value: wf === 'demulsifier' ? 'Oilfield Demulsifiers' : 'Gasoline Blending Additives' },
    { label: 'Datasets', value: datasets.length ? datasets.map((d) => d.id).join(', ') : 'None in scope' },
    { label: 'Experiments in scope', value: String(total) },
    { label: 'With recorded results', value: String(withResults) },
    { label: 'Not yet measured', value: String(total - withResults) },
    { label: 'Test dates', value: dates.length ? `${fmtDate(dates[0])} to ${fmtDate(dates[dates.length - 1])}` : 'No tests in range' },
    { label: 'Requested range', value: `${fmtDate(config.dateFrom)} to ${fmtDate(config.dateTo)}` },
    {
      label: 'Status mix',
      value: statusCounts.size
        ? Array.from(statusCounts.entries()).map(([s, n]) => `${n} ${s}`).join(', ')
        : 'None',
    },
  ]

  let experimentTable: TableData
  let groups: GroupRow[]
  let groupTitle: string
  let groupUnit: string
  let conditionTable: TableData
  const conditionWarnings: string[] = []
  let crudes: CrudeSample[] = []
  let blends: GasolineBlend[] = []
  let demSeries: DoseSeries[] = []
  let gasSeries: GasSeries[] = []
  let refConditions: ReferenceConditions | null = null
  let chartCaption = ''

  if (wf === 'demulsifier') {
    experimentTable = {
      head: ['Experiment', 'Date', 'Formulation', 'Crude', 'Dosage', 'Temp.', 'Settling', 'Water sep.', 'Status'],
      rows: demExps.map((e) => [
        e.id,
        fmtDate(e.testDate),
        e.formulationId,
        e.crudeId,
        fmtVal(e.dosagePpm, 'ppm'),
        fmtVal(e.tempC, '°C'),
        fmtVal(e.settlingMin, 'min'),
        fmtVal(e.waterSepPct, '%'),
        e.status,
      ]),
    }
    groupTitle = 'Formulations Compared'
    groupUnit = '% water separation'
    groups = selForms.map((f) => {
      const mine = demExps.filter((e) => e.formulationId === f.id)
      const vals = mine.filter(hasResult).map((e) => e.waterSepPct as number)
      return {
        key: f.id,
        label: f.id,
        sub: f.name,
        color: f.color,
        description: f.description,
        tests: mine.length,
        withResults: vals.length,
        meanValue: mean(vals),
        ...minMax(vals),
      }
    })
    crudes = state.crudes.filter((c) => demExps.some((e) => e.crudeId === c.id))
    const dosages = uniqueSorted(demExps.map((e) => e.dosagePpm).filter((v): v is number => v !== null))
    const temps = uniqueSorted(demExps.map((e) => e.tempC).filter((v): v is number => v !== null))
    const settles = uniqueSorted(demExps.map((e) => e.settlingMin).filter((v): v is number => v !== null))
    const mixes = uniqueSorted(demExps.map((e) => e.mixing))
    conditionTable = {
      head: ['Condition', 'Values in report'],
      rows: [
        ['Crude samples', crudes.length ? crudes.map((c) => `${c.id} ${c.name} (${c.waterCutPct} % water cut, ${c.apiGravity} °API)`).join('; ') : 'None'],
        ['Dosage levels', dosages.length ? dosages.map((d) => `${d} ppm`).join(', ') : 'Not recorded'],
        ['Temperatures', temps.length ? temps.map((d) => `${d} °C`).join(', ') : 'Not recorded'],
        ['Settling times', settles.length ? settles.map((d) => `${d} min`).join(', ') : 'Not recorded'],
        ['Mixing', mixes.length ? mixes.join('; ') : 'Not recorded'],
        ['Response', 'Water separation (%) observed at the end of the recorded settling time'],
      ],
    }
    conditionDiffs(demResults).forEach((d) =>
      conditionWarnings.push(`${d.variable} differs across recorded results: ${d.values.join(', ')}.`),
    )
    if (demResults.length) {
      const crudeRef = config.crudeIds.length === 1 ? config.crudeIds[0] : (mode(demResults.map((e) => e.crudeId)) as string)
      const tempRef = mode(demResults.map((e) => e.tempC).filter((v): v is number => v !== null))
      const setRef = mode(demResults.map((e) => e.settlingMin).filter((v): v is number => v !== null))
      if (tempRef !== null && setRef !== null) {
        refConditions = { crudeId: crudeRef, tempC: tempRef, settlingMin: setRef }
        demSeries = buildDoseSeries(demExps, selForms.map((f) => f.id), refConditions, false)
        chartCaption = `Observed water separation against dosage. Reference conditions: ${crudeRef}, ${tempRef} °C, ${setRef} min. Filled markers match the reference; hollow dashed markers were recorded under different conditions. Lines connect replicate means of matched points only and are not a fitted model.`
      }
    }
  } else {
    const blendIds = uniqueSorted(gasExps.map((e) => e.blendId))
    blends = state.blends.filter((b) => blendIds.includes(b.id))
    experimentTable = {
      head: ['Experiment', 'Date', 'Blend', 'Additive', 'Booster dosage', 'RON', 'Status'],
      rows: gasExps.map((e) => [
        e.id,
        fmtDate(e.testDate),
        e.blendId,
        e.additiveType,
        fmtVal(e.boosterPpm, 'ppm'),
        fmtVal(e.ron, '', 1),
        e.status,
      ]),
    }
    groupTitle = 'Formulations Compared'
    groupUnit = 'measured RON'
    groups = blends.map((b) => {
      const mine = gasExps.filter((e) => e.blendId === b.id)
      const vals = mine.filter(hasRon).map((e) => e.ron as number)
      const additives = uniqueSorted(mine.map((e) => e.additiveType)).join(', ')
      return {
        key: b.id,
        label: b.id,
        sub: `${b.name} with ${additives}`,
        color: b.color,
        description: `${b.description} Base composition: ${b.components.map((c) => `${c.name} ${c.pct} %`).join(', ')}.`,
        tests: mine.length,
        withResults: vals.length,
        meanValue: mean(vals),
        ...minMax(vals),
      }
    })
    const dosages = uniqueSorted(gasExps.map((e) => e.boosterPpm).filter((v): v is number => v !== null))
    conditionTable = {
      head: ['Condition', 'Values in report'],
      rows: [
        ['Blend families', blends.length ? blends.map((b) => `${b.id} ${b.name}`).join('; ') : 'None'],
        ['Additives', uniqueSorted(gasExps.map((e) => e.additiveType)).join(', ') || 'None'],
        ['Booster dosage levels', dosages.length ? dosages.map((d) => `${d} ppm`).join(', ') : 'Not recorded'],
        ['Base compositions', blends.length ? blends.map((b) => `${b.id}: ${b.components.map((c) => `${c.name} ${c.pct} %`).join(', ')}`).join('; ') : 'Not recorded'],
        ['Response', 'Measured research octane number (RON)'],
      ],
    }
    if (blends.length > 1)
      conditionWarnings.push('Blend families have different base compositions. Booster response should not be compared across blends as if the base fuel were identical.')
    gasSeries = blends.map((b) => ({
      key: b.id,
      label: b.id,
      color: b.color,
      points: gasResults
        .filter((e) => e.blendId === b.id)
        .map((e) => ({ x: e.boosterPpm as number, y: e.ron as number, id: e.id }))
        .sort((a, c) => a.x - c.x),
    }))
    chartCaption = 'Measured RON against booster dosage for each blend family. Blends have different base compositions; the lines connect recorded points only and are not a fitted model.'
  }

  if (demExps.some((e) => e.waterSepPct === null) || gasExps.some((e) => e.ron === null))
    conditionWarnings.push('Some experiments have no recorded result. They are listed as "Not measured" and are excluded from every average and chart.')

  const insights = state.insights.filter(
    (i) => i.workflow === wf && (i.formulationIds.length === 0 || i.formulationIds.some((f) => selFormIds.has(f))),
  )

  const recsAll = state.recommendations.filter(
    (r) =>
      r.workflow === wf &&
      (selFormIds.has(r.formulationId) || (r.additiveType ? selFormIds.has(r.additiveType) : false)) &&
      (wf === 'gasoline' || config.crudeIds.length === 0 || config.crudeIds.includes(r.crudeId)),
  )
  const recommendations: RecommendationRow[] = recsAll
    .filter((r) => r.status !== 'Rejected')
    .map((rec) => {
      const plan = rec.planId ? (state.plan.find((p) => p.id === rec.planId) ?? null) : null
      return { rec, plan, assignee: plan?.assigneeId ? (state.users.find((u) => u.id === plan.assigneeId) ?? null) : null }
    })
  const rejectedCount = recsAll.length - recommendations.length

  const observations: ObservationRow[] = []
  if (wf === 'demulsifier') {
    const notable = demResults.filter((e) => e.ragLayer && e.ragLayer !== 'None observed' && e.observations && !/^No results/.test(e.observations))
    const pool = (notable.length ? notable : demResults.filter((e) => e.observations && !/^No results/.test(e.observations))).slice(0, 6)
    pool.forEach((e) =>
      observations.push({
        id: e.id,
        title: `${e.id}: ${e.formulationId} at ${fmtVal(e.dosagePpm, 'ppm')}`,
        body: `${e.observations} Rag layer: ${e.ragLayer ?? 'Not recorded'}. Clarity: ${e.clarity ?? 'Not recorded'}.`,
        refs: [e.id],
      }),
    )
  } else {
    gasResults
      .filter((e) => e.observations && !/^(No results|Duplicated)/.test(e.observations))
      .slice(0, 6)
      .forEach((e) =>
        observations.push({ id: e.id, title: `${e.id}: ${e.blendId} with ${e.additiveType} at ${fmtVal(e.boosterPpm, 'ppm')}`, body: e.observations, refs: [e.id] }),
      )
  }

  const items = state.reportItems

  const cited = new Map<string, Set<string>>()
  const cite = (id: string, by: string) => cited.set(id, (cited.get(id) ?? new Set()).add(by))
  if (config.includeInsights) insights.forEach((i) => i.experimentIds.forEach((id) => cite(id, `Insight ${i.id}`)))
  if (config.includeRecommendations) recommendations.forEach(({ rec }) => rec.supportingExperimentIds.forEach((id) => cite(id, `Recommendation ${rec.id}`)))
  items.forEach((it) => it.refs.forEach((id) => cite(id, `Added to report: ${it.title}`)))
  const scopeIds = new Set([...demExps.map((e) => e.id), ...gasExps.map((e) => e.id)])
  const references: RefRow[] = Array.from(cited.entries())
    .map(([id, by]) => {
      const dem = state.experiments.find((e) => e.id === id)
      const gas = state.gasoline.find((e) => e.id === id)
      if (!dem && !gas) return null
      return {
        id,
        summary: dem
          ? `${dem.formulationId} on ${dem.crudeId}, ${fmtVal(dem.dosagePpm, 'ppm')}, ${fmtVal(dem.tempC, '°C')}, ${fmtVal(dem.settlingMin, 'min')}`
          : `${gas!.blendId} with ${gas!.additiveType}, ${fmtVal(gas!.boosterPpm, 'ppm')}`,
        result: dem ? fmtVal(dem.waterSepPct, '% water separation') : fmtVal(gas!.ron, 'RON', 1),
        citedBy: Array.from(by).join('; '),
        inScope: scopeIds.has(id),
      } satisfies RefRow
    })
    .filter((r): r is RefRow => r !== null)
    .sort((a, b) => a.id.localeCompare(b.id))

  const validation: string[] = []
  if (config.includeRecommendations)
    recommendations.slice(0, 4).forEach(({ rec }) =>
      validation.push(
        `Run the proposed test "${rec.title}" (${rec.formulationId}${rec.crudeId && wf === 'demulsifier' ? ` on ${rec.crudeId}` : ''}, ${rec.dosagePpm} ppm) and compare the recorded result against the neighbouring points before drawing any conclusion.`,
      ),
    )
  if (conditionWarnings.some((w) => /differs/.test(w)) || (wf === 'gasoline' && blends.length > 1))
    validation.push('Repeat the comparison under matched conditions (same crude or base blend, temperature, settling time and mixing) before ranking formulations.')
  if (wf === 'demulsifier') {
    validation.push('Replicate each key dosage level at least three times to estimate bottle-to-bottle variability.')
    if (crudes.length > 1) validation.push('Treat each crude sample separately. Do not pool results across crudes with different water cut or gravity.')
    validation.push('Confirm the water-content measurement method and instrument calibration used for the recorded water separation values.')
    validation.push('Treat bottle-test results as screening evidence only. Confirm any promising formulation with field-representative samples before operational use.')
  } else {
    validation.push('Confirm RON values with the reference engine method and replicate measurements in the dosage range where the response changes slope.')
    validation.push('Verify each blend base composition independently and keep base composition matched when comparing boosters.')
    validation.push('Treat these results as screening evidence only. Confirm with regulatory test methods before any blending decision.')
  }

  return {
    config,
    workflow: wf,
    title: config.title.trim() || defaultTitle(wf, config.formulationIds, config.crudeIds),
    reportId: `SL-RPT-${TODAY_ISO.replaceAll('-', '')}-${wf === 'demulsifier' ? 'DEM' : 'GAS'}`,
    generatedOn: TODAY_ISO,
    authorName,
    empty: total === 0,
    datasetTable,
    overview,
    experimentTable,
    groupTitle,
    groups,
    groupUnit,
    conditionTable,
    conditionWarnings,
    crudes,
    blends,
    demSeries,
    gasSeries,
    refConditions,
    insights,
    observations,
    references,
    recommendations,
    rejectedCount,
    reportItems: items,
    notes: config.notes.trim(),
    validation,
    chartCaption,
  }
}

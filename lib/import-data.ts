import type { CrudeSample, CustomImportSource, Experiment, Formulation, GasolineExperiment, WorkflowId, GasolineBlend } from './types'
import { MIXING_DEFAULT } from './seed'

export interface ImportField {
  key: string
  label: string
  unit?: string
  required: boolean
}

export const DEM_FIELDS: ImportField[] = [
  { key: 'expRef', label: 'Experiment Reference', required: false },
  { key: 'testDate', label: 'Test Date', required: false },
  { key: 'formulationId', label: 'Demulsifier Formulation ID', required: true },
  { key: 'crudeId', label: 'Crude Source', required: true },
  { key: 'dosagePpm', label: 'Chemical Dosage', unit: 'ppm', required: true },
  { key: 'tempC', label: 'Test Temperature', unit: '°C', required: true },
  { key: 'settlingMin', label: 'Settling Time', unit: 'min', required: true },
  { key: 'waterSepPct', label: 'Water Separation', unit: '%', required: true },
  { key: 'residualWaterPct', label: 'Residual Water / BS&W', unit: '%', required: false },
  { key: 'ragLayer', label: 'Rag-Layer Observation', required: false },
  { key: 'technician', label: 'Technician', required: false },
]

export const GAS_FIELDS: ImportField[] = [
  { key: 'expRef', label: 'Experiment Reference', required: false },
  { key: 'testDate', label: 'Test Date', required: false },
  { key: 'blendId', label: 'Blend ID', required: true },
  { key: 'additiveType', label: 'Booster / Additive Type', required: true },
  { key: 'boosterPpm', label: 'Booster Dosage', unit: 'ppm', required: true },
  { key: 'ron', label: 'Measured RON', unit: 'RON', required: true },
]

export const UNIT_FIELD: ImportField = { key: 'doseUnit', label: 'Dosage Unit (source)', required: false }

export interface ImportSource {
  datasetId: string
  fileName: string
  workflow: WorkflowId
  columns: string[]
  rows: Record<string, string>[]
}

function table(columns: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ''])))
}

const COLS_A = ['Exp_Ref', 'Test_Dt', 'Demul_ID', 'Crude_Src', 'Chem_Dose', 'Dose_Unit', 'Temp_C', 'Settle_min', 'Sep_pct', 'BSW_pct', 'Rag_Obs', 'Tech']

const ROWS_A: string[][] = [
  ['DEM-001', '2026-09-01', 'DM-A101', 'CR-101', '50', 'ppm', '60', '30', '60', '2.0', 'Thick rag layer (~6 mm)', 'Okafor'],
  ['DEM-002', '2026-09-02', 'DM-A101', 'CR-101', '100', 'ppm', '60', '30', '82', '1.0', 'Thin rag layer (~1 mm)', 'Ibarra'],
  ['DEM-003', '2026-09-03', 'DM-A101', 'CR-101', '150', 'ppm', '60', '30', '84', '0.9', 'Thin rag layer (~1 mm)', 'Tanaka'],
  ['DEM-004', '2026-09-05', 'DM-B205', 'CR-101', '100', 'ppm', '60', '30', '87', '0.8', 'None observed', 'Okafor'],
  ['DEM-005', '2026-09-06', 'DM-B205', 'CR-101', '50', 'ppm', '60', '30', '70', '1.5', 'Moderate rag layer (~3 mm)', 'Ibarra'],
  ['DEM-006', '2026-09-07', 'DM-A101', 'CR-101', '100', 'ppm', '55', '30', '72', '1.4', 'Moderate rag layer (~3 mm)', 'Tanaka'],
  ['DEM-007', '2026-09-08', 'DM-A101', 'CR-101', '100', 'ppm', '60', '15', '66', '1.8', 'Moderate rag layer (~3 mm)', 'Okafor'],
  ['DEM-008', '2026-09-09', 'DM-A101', 'CR-202', '100', 'ppm', '60', '30', '68', '1.6', 'Moderate rag layer (~3 mm)', 'Ibarra'],
  ['DEM-009', '2026-09-10', 'DM-A101', 'CR-101', '100', 'ppm', '60', '30', '81', '1.1', 'Thin rag layer (~1 mm)', 'Tanaka'],
  ['SEP-110', '2026-10-06', 'DM-A101', 'CR-101', '125', 'ppm', '60', '30', '83', '1.0', 'Thin rag layer (~1 mm)', 'Okafor'],
  ['SEP-111', '2026-10-06', 'DM-A101', 'CR-101', '0', 'ppm', '60', '30', '0', '9.5', 'No separation', 'Okafor'],
  ['SEP-112', '2026-10-07', 'DM-B205', 'CR-101', '75', 'ppm', '60', '30', '79', '1.1', 'Thin rag layer (~1 mm)', 'Ibarra'],
  ['SEP-113', '2026-10-07', 'DM-B205', 'CR-101', '125', 'ppm', '60', '30', '88', '0.7', 'None observed', 'Ibarra'],
  ['SEP-114', '2026-10-08', 'DM-C310', 'CR-101', '125', 'ppm', '60', '30', '82', '', 'Thin rag layer (~1 mm)', 'Tanaka'],
  ['SEP-115', '2026-10-08', 'DM-D412', 'CR-101', '100', 'ppm', '65', '30', '', '', '', 'Okafor'],
  ['SEP-116', '2026-10-09', 'DM-X900', 'CR-101', '100', 'ppm', '60', '30', '76', '1.2', 'Moderate rag layer (~3 mm)', 'Ibarra'],
  ['SEP-117', '2026-10-09', 'DM-A101', 'CR-101', 'abc', 'ppm', '60', '30', '80', '1.2', 'Thin rag layer (~1 mm)', 'Tanaka'],
  ['SEP-118', '2026-10-10', 'DM-E520', 'CR-404', '100', 'mg/L', '60', '30', '66', '1.7', 'Moderate rag layer (~3 mm)', 'Okafor'],
]

const COLS_B = ['Trial', 'Date', 'Chem_Code', 'Crude', 'Dose_ppm', 'T_degC', 'Settle_min', 'Water_Sep_pct', 'Resid_BSW']
const ROWS_B: string[][] = [
  ['DEM-008', '2026-09-09', 'DM-A101', 'CR-202', '100', '60', '30', '68', '1.6'],
  ['DEM-014', '2026-09-16', 'DM-A101', 'CR-202', '50', '60', '30', '52', '2.4'],
  ['DEM-015', '2026-09-17', 'DM-A101', 'CR-202', '150', '60', '30', '74', '1.3'],
  ['DEM-021', '2026-09-24', 'DM-B205', 'CR-202', '100', '60', '30', '74', '1.3'],
  ['CT-201', '2026-10-05', 'DM-B205', 'CR-202', '125', '60', '30', '78', '1.2'],
  ['CT-202', '2026-10-05', 'DM-C310', 'CR-202', '100', '60', '30', '66', '1.7'],
  ['CT-203', '2026-10-06', 'DM-C310', 'CR-303', '150', '60', '30', '76', '1.2'],
  ['CT-204', '2026-10-06', 'DM-A101', 'CR-404', '100', '60', '30', '63', '2.0'],
  ['CT-205', '2026-10-07', 'DM-E520', 'CR-303', '100', '60', '30', '', ''],
  ['CT-206', '2026-10-07', 'DM-D412', 'CR-202', '100', '—', '30', '67', '1.6'],
  ['CT-207', '2026-10-08', 'DM-D412', 'CR-303', '150', '60', '30', '73', '1.4'],
  ['CT-208', '2026-10-08', 'DM-E520', 'CR-404', '100', '60', '45', '71', '1.5'],
]

const COLS_C = ['Run', 'Date', 'Blend', 'Additive', 'Dose_ppm', 'RON_meas']
const ROWS_C: string[][] = [
  ['GAS-001', '2026-09-16', 'GB-A01', 'ADD-OB7', '0', '91.0'],
  ['GAS-002', '2026-09-17', 'GB-A01', 'ADD-OB7', '100', '91.7'],
  ['GAS-003', '2026-09-18', 'GB-A01', 'ADD-OB7', '200', '92.2'],
  ['GS-301', '2026-10-06', 'GB-A01', 'ADD-OB7', '300', '92.4'],
  ['GS-302', '2026-10-06', 'GB-C03', 'ADD-OB9', '100', '90.9'],
  ['GS-303', '2026-10-07', 'GB-C03', 'ADD-OB9', '300', '91.8'],
  ['GS-304', '2026-10-07', 'GB-B02', 'ADD-OB7', '500', '93.5'],
  ['GS-305', '2026-10-08', 'GB-B02', 'ADD-OB7', '300', ''],
  ['GS-306', '2026-10-08', 'GB-Z99', 'ADD-OB7', '200', '92.0'],
]

export const SAMPLE_SOURCES: ImportSource[] = [
  { datasetId: 'DS-001', fileName: 'bottle_tests_sep2026.csv', workflow: 'demulsifier', columns: COLS_A, rows: table(COLS_A, ROWS_A) },
  { datasetId: 'DS-002', fileName: 'crude_separation_trials.xlsx', workflow: 'demulsifier', columns: COLS_B, rows: table(COLS_B, ROWS_B) },
  { datasetId: 'DS-003', fileName: 'gasoline_blend_screening.csv', workflow: 'gasoline', columns: COLS_C, rows: table(COLS_C, ROWS_C) },
]

export function fieldsFor(workflow: WorkflowId): ImportField[] {
  return workflow === 'demulsifier' ? DEM_FIELDS : GAS_FIELDS
}

const SYNONYMS: Record<string, string[]> = {
  expRef: ['exp_ref', 'trial', 'run', 'experiment', 'experiment_id', 'exp_id', 'id', 'ref'],
  testDate: ['test_dt', 'date', 'test_date', 'tested_on'],
  formulationId: ['demul_id', 'chem_code', 'formulation', 'formulation_id', 'demulsifier', 'product'],
  crudeId: ['crude_src', 'crude', 'crude_source', 'sample', 'crude_id'],
  dosagePpm: ['chem_dose', 'dose_ppm', 'dosage', 'dose', 'dosage_ppm'],
  tempC: ['temp_c', 't_degc', 'temp', 'temperature'],
  settlingMin: ['settle_min', 'settling', 'settling_time', 'settle'],
  waterSepPct: ['sep_pct', 'water_sep_pct', 'water_separation', 'separation'],
  residualWaterPct: ['bsw_pct', 'resid_bsw', 'bsw', 'residual_water'],
  ragLayer: ['rag_obs', 'rag', 'rag_layer'],
  technician: ['tech', 'technician', 'operator'],
  blendId: ['blend', 'blend_id'],
  additiveType: ['additive', 'booster', 'additive_type'],
  boosterPpm: ['dose_ppm', 'booster_ppm', 'booster_dose', 'dose'],
  ron: ['ron_meas', 'ron', 'octane'],
  doseUnit: ['dose_unit', 'unit'],
}

export function suggestMapping(columns: string[], workflow: WorkflowId): Record<string, string> {
  const fields = [...fieldsFor(workflow), UNIT_FIELD]
  const used = new Set<string>()
  const mapping: Record<string, string> = {}
  columns.forEach((col) => {
    const norm = col.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const match = fields.find((f) => !used.has(f.key) && SYNONYMS[f.key]?.includes(norm))
    if (match) {
      mapping[col] = match.key
      used.add(match.key)
    } else {
      mapping[col] = ''
    }
  })
  return mapping
}

export type IssueSeverity = 'error' | 'warning' | 'info'
export interface RowIssue {
  severity: IssueSeverity
  field: string
  message: string
  kind: 'invalid' | 'missing' | 'zero' | 'unit' | 'duplicate' | 'unknown' | 'range'
}

export interface ParsedRow {
  index: number
  raw: Record<string, string>
  state: 'ok' | 'flagged' | 'skipped'
  issues: RowIssue[]
  values: Record<string, string>
}

export interface AnalysisResult {
  globalIssues: { severity: IssueSeverity; message: string }[]
  rows: ParsedRow[]
  added: number
  skipped: number
  flagged: number
  unitColumn: string | null
  unitValues: Record<string, number>
}

interface Context {
  workflow: WorkflowId
  columns: string[]
  rows: Record<string, string>[]
  mapping: Record<string, string>
  unitConfirmed: boolean
  existingIds: string[]
  formulations: Formulation[]
  crudes: CrudeSample[]
  blends: GasolineBlend[]
}

function numeric(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.trim())
  return Number.isFinite(n) ? n : NaN
}

const RANGES: Record<string, [number, number]> = {
  dosagePpm: [0, 2000],
  tempC: [0, 150],
  settlingMin: [1, 1440],
  waterSepPct: [0, 100],
  residualWaterPct: [0, 100],
  boosterPpm: [0, 5000],
  ron: [70, 120],
}

const NUMERIC_KEYS = Object.keys(RANGES)

export function analyseImport(ctx: Context): AnalysisResult {
  const fields = fieldsFor(ctx.workflow)
  const colFor = (key: string) => ctx.columns.find((c) => ctx.mapping[c] === key) ?? null
  const globalIssues: AnalysisResult['globalIssues'] = []

  fields
    .filter((f) => f.required)
    .forEach((f) => {
      if (!colFor(f.key)) globalIssues.push({ severity: 'error', message: `Required field "${f.label}" is not mapped to a source column.` })
    })
  const counts: Record<string, number> = {}
  ctx.columns.forEach((c) => {
    const k = ctx.mapping[c]
    if (k) counts[k] = (counts[k] ?? 0) + 1
  })
  Object.entries(counts).forEach(([k, n]) => {
    if (n > 1) {
      const label = [...fields, UNIT_FIELD].find((f) => f.key === k)?.label ?? k
      globalIssues.push({ severity: 'warning', message: `${n} source columns are mapped to "${label}". Only the first will be used.` })
    }
  })

  const unitColumn = colFor('doseUnit')
  const unitValues: Record<string, number> = {}
  if (unitColumn) ctx.rows.forEach((r) => (unitValues[r[unitColumn]] = (unitValues[r[unitColumn]] ?? 0) + 1))

  const blocking = globalIssues.some((g) => g.severity === 'error')
  const seenRefs = new Set<string>()

  const rows: ParsedRow[] = ctx.rows.map((raw, index) => {
    const values: Record<string, string> = {}
    fields.forEach((f) => {
      const col = colFor(f.key)
      values[f.key] = col ? (raw[col] ?? '').trim() : ''
    })
    const issues: RowIssue[] = []
    const add = (i: RowIssue) => issues.push(i)

    const ref = values.expRef
    if (ref) {
      if (ctx.existingIds.includes(ref) || seenRefs.has(ref)) {
        add({ severity: 'error', field: 'expRef', kind: 'duplicate', message: `Duplicate: ${ref} already exists in the workspace.` })
      }
      seenRefs.add(ref)
    }

    if (ctx.workflow === 'demulsifier') {
      if (values.formulationId && !ctx.formulations.some((f) => f.id === values.formulationId))
        add({ severity: 'error', field: 'formulationId', kind: 'unknown', message: `Unknown formulation "${values.formulationId}".` })
      if (values.crudeId && !ctx.crudes.some((c) => c.id === values.crudeId))
        add({ severity: 'error', field: 'crudeId', kind: 'unknown', message: `Unknown crude source "${values.crudeId}".` })
    } else {
      if (values.blendId && !ctx.blends.some((b) => b.id === values.blendId))
        add({ severity: 'error', field: 'blendId', kind: 'unknown', message: `Unknown blend "${values.blendId}".` })
    }

    NUMERIC_KEYS.forEach((key) => {
      const f = fields.find((x) => x.key === key)
      if (!f || !colFor(key)) return
      const n = numeric(values[key])
      if (n === null) {
        if (f.required && (key === 'waterSepPct' || key === 'ron')) {
          add({ severity: 'warning', field: key, kind: 'missing', message: `${f.label} is missing. Row will be imported as Pending.` })
        } else if (f.required) {
          add({ severity: 'error', field: key, kind: 'missing', message: `${f.label} is required but blank.` })
        } else {
          add({ severity: 'warning', field: key, kind: 'missing', message: `${f.label} not measured (blank, not zero).` })
        }
      } else if (Number.isNaN(n)) {
        add({ severity: 'error', field: key, kind: 'invalid', message: `${f.label}: "${values[key]}" is not a number.` })
      } else {
        const [lo, hi] = RANGES[key]
        if (n < lo || n > hi) add({ severity: 'error', field: key, kind: 'range', message: `${f.label}: ${n} is outside ${lo}–${hi}.` })
        else if (n === 0) add({ severity: 'info', field: key, kind: 'zero', message: `${f.label}: recorded zero (kept as 0).` })
      }
    })

    if (unitColumn) {
      const u = (raw[unitColumn] ?? '').trim()
      if (u && u.toLowerCase() !== 'ppm') {
        if (ctx.unitConfirmed) add({ severity: 'warning', field: 'doseUnit', kind: 'unit', message: `Source unit "${u}" interpreted as ppm per your confirmation.` })
        else add({ severity: 'error', field: 'doseUnit', kind: 'unit', message: `Source unit "${u}" is not ppm. Confirm the interpretation before import.` })
      }
    }

    const hasError = blocking || issues.some((i) => i.severity === 'error')
    const hasWarn = issues.some((i) => i.severity === 'warning')
    return { index, raw, values, issues, state: hasError ? 'skipped' : hasWarn ? 'flagged' : 'ok' }
  })

  return {
    globalIssues,
    rows,
    added: rows.filter((r) => r.state !== 'skipped').length,
    skipped: rows.filter((r) => r.state === 'skipped').length,
    flagged: rows.filter((r) => r.state === 'flagged').length,
    unitColumn,
    unitValues,
  }
}

export function buildImportedExperiments(
  rows: ParsedRow[],
  source: { datasetId: string; fileName: string },
  nextId: () => string,
  crudes: CrudeSample[],
  fallbackDate: string,
): Experiment[] {
  return rows
    .filter((r) => r.state !== 'skipped')
    .map((r) => {
      const v = r.values
      const crude = crudes.find((c) => c.id === v.crudeId)!
      const sep = numeric(v.waterSepPct)
      const bsw = numeric(v.residualWaterPct)
      const noteBits = [`Imported from ${source.fileName}${v.expRef ? ` (source ref ${v.expRef})` : ''}.`]
      r.issues.filter((i) => i.severity !== 'info').forEach((i) => noteBits.push(i.message))
      const tech = v.technician
      return {
        id: nextId(),
        workflow: 'demulsifier' as const,
        testDate: v.testDate || fallbackDate,
        datasetId: source.datasetId,
        formulationId: v.formulationId,
        crudeId: v.crudeId,
        sampleId: crude.sampleId,
        dosagePpm: numeric(v.dosagePpm) as number,
        tempC: numeric(v.tempC) as number,
        settlingMin: numeric(v.settlingMin) as number,
        waterCutPct: crude.waterCutPct,
        mixing: MIXING_DEFAULT,
        waterSepPct: sep,
        residualWaterPct: bsw,
        ragLayer: v.ragLayer || null,
        clarity: null,
        observations: sep === null ? 'No separation result in source file.' : 'Imported measurement.',
        notes: noteBits.join(' '),
        technicianId: tech ? techByLastName(tech) : 'usr-chem1',
        status: sep === null ? ('Pending' as const) : ('Completed' as const),
        source: 'import' as const,
      }
    })
}

function techByLastName(name: string): string {
  const map: Record<string, string> = { okafor: 'usr-tech1', ibarra: 'usr-tech2', tanaka: 'usr-tech3' }
  return map[name.toLowerCase()] ?? 'usr-chem1'
}

export function buildImportedGasoline(
  rows: ParsedRow[],
  source: { datasetId: string; fileName: string },
  nextId: () => string,
  blends: GasolineBlend[],
  fallbackDate: string,
): GasolineExperiment[] {
  return rows
    .filter((r) => r.state !== 'skipped')
    .map((r) => {
      const v = r.values
      const blend = blends.find((b) => b.id === v.blendId)!
      const ron = numeric(v.ron)
      return {
        id: nextId(),
        workflow: 'gasoline' as const,
        testDate: v.testDate || fallbackDate,
        datasetId: source.datasetId,
        blendId: v.blendId,
        components: blend.components.map((c) => ({ ...c })),
        additiveType: v.additiveType || 'ADD-OB7',
        boosterPpm: numeric(v.boosterPpm) as number,
        ron,
        observations: `Imported from ${source.fileName}${v.expRef ? ` (source ref ${v.expRef})` : ''}.${ron === null ? ' No RON in source file.' : ''}`,
        technicianId: 'usr-chem2',
        status: ron === null ? ('Pending' as const) : ('Completed' as const),
        source: 'import' as const,
      }
    })
}

/** Minimal in-browser CSV parser (quoted fields supported). */
export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } | null {
  const lines: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') {
      cur.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      cur.push(field)
      field = ''
      if (cur.some((c) => c.trim() !== '')) lines.push(cur)
      cur = []
    } else field += ch
  }
  cur.push(field)
  if (cur.some((c) => c.trim() !== '')) lines.push(cur)
  if (lines.length < 2) return null
  const columns = lines[0].map((c) => c.trim())
  if (columns.length < 2 || columns.some((c) => c === '')) return null
  return { columns, rows: lines.slice(1).map((l) => Object.fromEntries(columns.map((c, i) => [c, (l[i] ?? '').trim()]))) }
}

export function detectWorkflow(columns: string[]): WorkflowId {
  const lower = columns.map((c) => c.toLowerCase())
  return lower.some((c) => c.includes('ron') || c.includes('blend')) ? 'gasoline' : 'demulsifier'
}

export function sourceFromSession(datasetId: string | null, custom: CustomImportSource | null): ImportSource | null {
  if (custom) return { datasetId: 'UPLOAD', fileName: custom.fileName, workflow: custom.workflow, columns: custom.columns, rows: custom.rows }
  return SAMPLE_SOURCES.find((s) => s.datasetId === datasetId) ?? null
}

export const CSV_TEMPLATE = [
  'Exp_Ref,Test_Dt,Demul_ID,Crude_Src,Chem_Dose,Dose_Unit,Temp_C,Settle_min,Sep_pct,BSW_pct,Rag_Obs,Tech',
  'NEW-001,2026-10-14,DM-A101,CR-101,100,ppm,60,30,82,1.0,Thin rag layer (~1 mm),Okafor',
  'NEW-002,2026-10-14,DM-B205,CR-101,100,ppm,60,30,87,0.8,None observed,Ibarra',
].join('\n')

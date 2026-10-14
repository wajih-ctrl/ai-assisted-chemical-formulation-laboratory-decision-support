import type {
  ActivityEvent,
  AnalyticalInsight,
  ChemicalCategory,
  CrudeSample,
  DataField,
  Experiment,
  ExperimentStatus,
  ExperimentTemplate,
  Formulation,
  GasolineBlend,
  GasolineExperiment,
  HistoricalDataset,
  Recommendation,
  TestingPlanItem,
  User,
} from './types'

export const TODAY_ISO = '2026-10-13'

export const users: User[] = [
  { id: 'usr-chem1', name: 'Dr. Amira Hassan', email: 'amira.hassan@stratalab.example', role: 'chemist', area: 'Demulsifier Laboratory', status: 'Active', lastActivity: '2026-10-13T08:42:00' },
  { id: 'usr-chem2', name: 'Chen Wei', email: 'chen.wei@stratalab.example', role: 'chemist', area: 'Fuel Additives Laboratory', status: 'Active', lastActivity: '2026-10-12T16:05:00' },
  { id: 'usr-tech1', name: 'Daniel Okafor', email: 'daniel.okafor@stratalab.example', role: 'technician', area: 'Demulsifier Laboratory', status: 'Active', lastActivity: '2026-10-13T07:58:00' },
  { id: 'usr-tech2', name: 'Tomás Ibarra', email: 'tomas.ibarra@stratalab.example', role: 'technician', area: 'Demulsifier Laboratory', status: 'Active', lastActivity: '2026-10-12T14:20:00' },
  { id: 'usr-tech3', name: 'Yuki Tanaka', email: 'yuki.tanaka@stratalab.example', role: 'technician', area: 'Crude Characterisation', status: 'Active', lastActivity: '2026-10-11T11:32:00' },
  { id: 'usr-tech4', name: 'Fatima Al-Mansouri', email: 'fatima.almansouri@stratalab.example', role: 'technician', area: 'Fuel Additives Laboratory', status: 'Active', lastActivity: '2026-10-12T10:11:00' },
  { id: 'usr-labmgr', name: 'Priya Raman', email: 'priya.raman@stratalab.example', role: 'lab-manager', area: 'Laboratory Operations', status: 'Active', lastActivity: '2026-10-13T09:10:00' },
  { id: 'usr-rdmgr', name: 'Marcus Lindqvist', email: 'marcus.lindqvist@stratalab.example', role: 'rd-manager', area: 'Formulation R&D', status: 'Active', lastActivity: '2026-10-10T15:44:00' },
  { id: 'usr-techmgr', name: 'Elena Vasquez', email: 'elena.vasquez@stratalab.example', role: 'tech-manager', area: 'Field Technical Services', status: 'Active', lastActivity: '2026-10-09T13:02:00' },
  { id: 'usr-admin', name: 'Sam Whitfield', email: 'sam.whitfield@stratalab.example', role: 'admin', area: 'Platform Configuration', status: 'Active', lastActivity: '2026-10-13T08:15:00' },
]

export const categories: ChemicalCategory[] = [
  { id: 'cat-demul', name: 'Oilfield Demulsifiers', workflow: 'demulsifier', description: 'Water-in-oil emulsion breakers evaluated by bottle-test water separation.', active: true },
  { id: 'cat-gas', name: 'Gasoline Blending Additives', workflow: 'gasoline', description: 'Octane boosters and blend additives evaluated by measured RON.', active: true },
  { id: 'cat-corr', name: 'Corrosion Inhibitors', workflow: 'demulsifier', description: 'Reserved category. Not enabled in this prototype.', active: false },
]

export const formulations: Formulation[] = [
  { id: 'DM-A101', name: 'EO/PO Block Copolymer, Series A', categoryId: 'cat-demul', description: 'General-purpose polyoxyalkylene demulsifier used as the working reference formulation for medium crudes.', status: 'Active', color: '#087f83' },
  { id: 'DM-B205', name: 'Phenolic Resin Ethoxylate, Series B', categoryId: 'cat-demul', description: 'Resin-ethoxylate blend developed for faster initial water drop at moderate temperatures.', status: 'Active', color: '#4076ba' },
  { id: 'DM-C310', name: 'Sulfonate-Modified Copolymer', categoryId: 'cat-demul', description: 'Modified copolymer under evaluation for crudes with higher naphthenic content.', status: 'Active', color: '#c18a35' },
  { id: 'DM-D412', name: 'Polyol Ester Demulsifier', categoryId: 'cat-demul', description: 'Ester-based candidate with a different interfacial behaviour profile.', status: 'Under Evaluation', color: '#b2573e' },
  { id: 'DM-E520', name: 'Silicone-Hybrid Demulsifier', categoryId: 'cat-demul', description: 'Hybrid formulation tested primarily on sour blend crude.', status: 'Under Evaluation', color: '#5b6b82' },
  { id: 'ADD-OB7', name: 'Octane Booster OB-7', categoryId: 'cat-gas', description: 'Illustrative non-metallic octane booster used across GB-A01 and GB-B02 screening.', status: 'Active', color: '#4076ba' },
  { id: 'ADD-OB9', name: 'Octane Booster OB-9', categoryId: 'cat-gas', description: 'Illustrative alternative booster used for GB-C03 screening.', status: 'Under Evaluation', color: '#c18a35' },
]

export const crudes: CrudeSample[] = [
  { id: 'CR-101', name: 'North Basin Medium', sampleId: 'CR-101-S1', waterCutPct: 30, apiGravity: 28.4, notes: 'Primary reference crude for controlled bottle-test series. Stable emulsion, moderate asphaltene content.' },
  { id: 'CR-202', name: 'Coastal Heavy', sampleId: 'CR-202-S1', waterCutPct: 35, apiGravity: 21.8, notes: 'Heavier crude with tighter emulsions. Not directly comparable with CR-101 results.' },
  { id: 'CR-303', name: 'Delta Light', sampleId: 'CR-303-S1', waterCutPct: 22, apiGravity: 34.6, notes: 'Light crude, lower viscosity. Limited historical coverage.' },
  { id: 'CR-404', name: 'Ridge Sour Blend', sampleId: 'CR-404-S1', waterCutPct: 40, apiGravity: 25.1, notes: 'Sour blend with elevated water cut. Used for silicone-hybrid trials.' },
]

export const MIXING_DEFAULT = 'Orbital shaker, 120 rpm, 5 min'

function deriveBsw(sep: number): number {
  return Math.round(((100 - sep) * 0.045 + 0.2) * 10) / 10
}
function deriveRag(sep: number): string {
  if (sep >= 88) return 'None observed'
  if (sep >= 80) return 'Thin rag layer (~1 mm)'
  if (sep >= 70) return 'Moderate rag layer (~3 mm)'
  return 'Thick rag layer (~6 mm)'
}
function deriveClarity(sep: number): string {
  if (sep >= 85) return 'Sharp'
  if (sep >= 75) return 'Moderately sharp'
  if (sep >= 65) return 'Diffuse'
  return 'Poorly defined'
}

const techRotation = ['usr-tech1', 'usr-tech2', 'usr-tech3']

function dateFor(n: number): string {
  const base = new Date('2026-09-01T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + Math.floor((n - 1) * 1.15))
  return base.toISOString().slice(0, 10)
}

interface DemInput {
  n: number
  f: string
  c: string
  dose: number
  temp: number
  settle: number
  sep: number | null
  ds?: string
  status?: ExperimentStatus
  bsw?: number | null
  tech?: string
  date?: string
  notes?: string
  obs?: string
  planId?: string
}

function dem(i: DemInput): Experiment {
  const id = `DEM-${String(i.n).padStart(3, '0')}`
  const crude = crudes.find((c) => c.id === i.c)!
  const hasResult = i.sep !== null
  return {
    id,
    workflow: 'demulsifier',
    testDate: i.date ?? dateFor(i.n),
    datasetId: i.ds ?? 'DS-001',
    formulationId: i.f,
    crudeId: i.c,
    sampleId: crude.sampleId,
    dosagePpm: i.dose,
    tempC: i.temp,
    settlingMin: i.settle,
    waterCutPct: crude.waterCutPct,
    mixing: MIXING_DEFAULT,
    waterSepPct: i.sep,
    residualWaterPct: hasResult ? (i.bsw === undefined ? deriveBsw(i.sep!) : i.bsw) : null,
    ragLayer: hasResult ? deriveRag(i.sep!) : null,
    clarity: hasResult ? deriveClarity(i.sep!) : null,
    observations:
      i.obs ??
      (hasResult
        ? `Water drop recorded at ${i.settle} min. Interface ${deriveClarity(i.sep!).toLowerCase()}; ${deriveRag(i.sep!).toLowerCase()}.`
        : 'No results recorded yet.'),
    notes: i.notes ?? '',
    technicianId: i.tech ?? techRotation[(i.n - 1) % techRotation.length],
    status: i.status ?? 'Completed',
    source: 'seed',
    planId: i.planId,
  }
}

export function buildExperiments(): Experiment[] {
  const d2 = 'DS-002'
  return [
    dem({ n: 1, f: 'DM-A101', c: 'CR-101', dose: 50, temp: 60, settle: 30, sep: 60, notes: 'Start of controlled dosage series on CR-101.' }),
    dem({ n: 2, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 82, notes: 'Reference point for A101 dosage series.' }),
    dem({ n: 3, f: 'DM-A101', c: 'CR-101', dose: 150, temp: 60, settle: 30, sep: 84, notes: 'Only a small increase over 100 ppm.' }),
    dem({ n: 4, f: 'DM-B205', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 87, notes: 'Matched to DEM-002 conditions.' }),
    dem({ n: 5, f: 'DM-B205', c: 'CR-101', dose: 50, temp: 60, settle: 30, sep: 70 }),
    dem({ n: 6, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 55, settle: 30, sep: 72, notes: 'Temperature variation: 55 °C bath.' }),
    dem({ n: 7, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 15, sep: 66, notes: 'Shortened settling time.' }),
    dem({ n: 8, f: 'DM-A101', c: 'CR-202', dose: 100, temp: 60, settle: 30, sep: 68, ds: d2, notes: 'Different crude sample (CR-202); not directly comparable with CR-101.' }),
    dem({ n: 9, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 81, notes: 'Replicate of DEM-002 for repeatability review.' }),
    dem({ n: 10, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 65, settle: 30, sep: 86 }),
    dem({ n: 11, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 70, settle: 30, sep: 87 }),
    dem({ n: 12, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 45, sep: 88 }),
    dem({ n: 13, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 60, sep: 90 }),
    dem({ n: 14, f: 'DM-A101', c: 'CR-202', dose: 50, temp: 60, settle: 30, sep: 52, ds: d2 }),
    dem({ n: 15, f: 'DM-A101', c: 'CR-202', dose: 150, temp: 60, settle: 30, sep: 74, ds: d2 }),
    dem({ n: 16, f: 'DM-B205', c: 'CR-101', dose: 150, temp: 60, settle: 30, sep: 89 }),
    dem({ n: 17, f: 'DM-B205', c: 'CR-101', dose: 100, temp: 55, settle: 30, sep: 77 }),
    dem({ n: 18, f: 'DM-B205', c: 'CR-101', dose: 100, temp: 65, settle: 30, sep: 90 }),
    dem({ n: 19, f: 'DM-B205', c: 'CR-101', dose: 100, temp: 60, settle: 15, sep: 73 }),
    dem({ n: 20, f: 'DM-B205', c: 'CR-101', dose: 100, temp: 60, settle: 45, sep: 91, bsw: 0, notes: 'Residual water reported as 0.0 % (recorded zero, below detection limit of the centrifuge method).' }),
    dem({ n: 21, f: 'DM-B205', c: 'CR-202', dose: 100, temp: 60, settle: 30, sep: 74, ds: d2 }),
    dem({ n: 22, f: 'DM-C310', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 78 }),
    dem({ n: 23, f: 'DM-C310', c: 'CR-101', dose: 50, temp: 60, settle: 30, sep: 61 }),
    dem({ n: 24, f: 'DM-C310', c: 'CR-101', dose: 150, temp: 60, settle: 30, sep: 85 }),
    dem({ n: 25, f: 'DM-C310', c: 'CR-303', dose: 100, temp: 60, settle: 30, sep: 71, ds: d2 }),
    dem({ n: 26, f: 'DM-D412', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 75 }),
    dem({ n: 27, f: 'DM-D412', c: 'CR-101', dose: 150, temp: 60, settle: 30, sep: 80 }),
    dem({ n: 28, f: 'DM-D412', c: 'CR-303', dose: 100, temp: 60, settle: 30, sep: 69, ds: d2 }),
    dem({ n: 29, f: 'DM-E520', c: 'CR-404', dose: 100, temp: 60, settle: 30, sep: 64, ds: d2 }),
    dem({ n: 30, f: 'DM-E520', c: 'CR-404', dose: 150, temp: 60, settle: 30, sep: 72, ds: d2 }),
    dem({ n: 31, f: 'DM-E520', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: 70, ds: d2 }),
    dem({ n: 32, f: 'DM-A101', c: 'CR-303', dose: 100, temp: 60, settle: 30, sep: null, status: 'In Progress', tech: 'usr-tech1', date: '2026-10-12', planId: 'PLN-001', obs: 'Bottles prepared and in the 60 °C bath. Results not yet recorded.' }),
    dem({ n: 33, f: 'DM-B205', c: 'CR-202', dose: 150, temp: 60, settle: 30, sep: 82, bsw: null, status: 'Under Review', tech: 'usr-tech2', date: '2026-10-09', planId: 'PLN-002', obs: 'Residual water (BS&W) not measured; centrifuge unavailable. Awaiting chemist review.' }),
    dem({ n: 34, f: 'DM-C310', c: 'CR-404', dose: 100, temp: 60, settle: 30, sep: null, status: 'Planned', tech: 'usr-tech2', date: '2026-10-20', planId: 'PLN-003' }),
    dem({ n: 35, f: 'DM-A101', c: 'CR-101', dose: 100, temp: 60, settle: 30, sep: null, status: 'Pending', tech: 'usr-tech1', date: '2026-10-15', planId: 'PLN-006', notes: 'Third replicate for repeatability review.' }),
    dem({ n: 36, f: 'DM-B205', c: 'CR-101', dose: 75, temp: 60, settle: 30, sep: null, status: 'Draft', tech: 'usr-chem1', date: '2026-10-13', notes: 'Draft entry; intermediate dosage placeholder.' }),
  ]
}

const compA01 = [
  { name: 'Reformate', pct: 40 },
  { name: 'FCC Gasoline', pct: 30 },
  { name: 'Alkylate', pct: 20 },
  { name: 'Isomerate', pct: 10 },
]
const compB02 = [
  { name: 'Reformate', pct: 35 },
  { name: 'Alkylate', pct: 30 },
  { name: 'FCC Gasoline', pct: 20 },
  { name: 'Isomerate', pct: 10 },
  { name: 'n-Butane', pct: 5 },
]
const compC03 = [
  { name: 'Reformate', pct: 45 },
  { name: 'Alkylate', pct: 25 },
  { name: 'Isomerate', pct: 20 },
  { name: 'FCC Gasoline', pct: 10 },
]

export const blends: GasolineBlend[] = [
  { id: 'GB-A01', name: 'Blend Family A01', components: compA01, color: '#4076ba', description: 'Reformate-led base blend with a substantial FCC gasoline fraction.' },
  { id: 'GB-B02', name: 'Blend Family B02', components: compB02, color: '#c18a35', description: 'Alkylate-rich base blend with a small n-butane fraction.' },
  { id: 'GB-C03', name: 'Blend Family C03', components: compC03, color: '#087f83', description: 'Reformate and isomerate-rich base blend with low FCC content.' },
]

function gas(n: number, blendId: string, dose: number, ron: number | null, opts: Partial<GasolineExperiment> = {}): GasolineExperiment {
  const blend = blends.find((b) => b.id === blendId)!
  const day = 15 + n
  return {
    id: `GAS-${String(n).padStart(3, '0')}`,
    workflow: 'gasoline',
    testDate: `2026-09-${String(Math.min(day, 30)).padStart(2, '0')}`,
    datasetId: 'DS-003',
    blendId,
    components: blend.components.map((c) => ({ ...c })),
    additiveType: blendId === 'GB-C03' ? 'ADD-OB9' : 'ADD-OB7',
    boosterPpm: dose,
    ron,
    observations:
      ron === null
        ? 'No results recorded yet.'
        : `Measured RON ${ron.toFixed(1)} at ${dose} ppm booster. Single determination.`,
    technicianId: n % 2 === 0 ? 'usr-tech4' : 'usr-tech3',
    status: 'Completed',
    source: 'seed',
    ...opts,
  }
}

export function buildGasolineExperiments(): GasolineExperiment[] {
  return [
    gas(1, 'GB-A01', 0, 91.0),
    gas(2, 'GB-A01', 100, 91.7),
    gas(3, 'GB-A01', 200, 92.2),
    gas(4, 'GB-A01', 400, 92.6),
    gas(5, 'GB-B02', 0, 92.0),
    gas(6, 'GB-B02', 100, 92.6),
    gas(7, 'GB-B02', 200, 93.1),
    gas(8, 'GB-B02', 400, 93.4),
    gas(9, 'GB-C03', 0, 90.4),
    gas(10, 'GB-C03', 200, 91.5),
    gas(11, 'GB-C03', 400, 91.9),
    gas(12, 'GB-B02', 300, null, { status: 'Planned', testDate: '2026-10-22', planId: 'PLN-010' }),
  ]
}

export const datasets: HistoricalDataset[] = [
  { id: 'DS-001', name: 'Demulsifier Bottle Tests — September 2026', workflow: 'demulsifier', rows: 27, description: 'Controlled bottle-test series on CR-101 with dosage, temperature and settling-time variations.', importedAt: '2026-10-01', source: 'bottle_tests_sep2026.csv' },
  { id: 'DS-002', name: 'Historical Crude Separation Trials', workflow: 'demulsifier', rows: 9, description: 'Cross-crude trials on CR-202, CR-303 and CR-404. Sample characteristics differ from CR-101.', importedAt: '2026-10-03', source: 'crude_separation_trials.xlsx' },
  { id: 'DS-003', name: 'Gasoline Blend Screening Results', workflow: 'gasoline', rows: 12, description: 'Booster dosage versus measured RON for three illustrative blend families.', importedAt: '2026-10-05', source: 'gasoline_blend_screening.csv' },
]

export const insights: AnalyticalInsight[] = [
  {
    id: 'INS-001',
    category: 'dosage',
    workflow: 'demulsifier',
    title: 'Potential diminishing returns for DM-A101 above 100 ppm',
    observation:
      'Under the displayed conditions, DM-A101 shows a small additional increase in recorded water separation between 100 ppm (82 %) and 150 ppm (84 %), compared with the increase between 50 ppm (60 %) and 100 ppm.',
    formulationIds: ['DM-A101'],
    experimentIds: ['DEM-001', 'DEM-002', 'DEM-003', 'DEM-009'],
    conditions: 'CR-101 · 60 °C · 30 min settling',
    explanation:
      'The illustrative records suggest that most of the recorded separation gain occurs by 100 ppm. DEM-002 and its replicate DEM-009 (81 %) bracket the 100 ppm value, so the 2-point difference to DEM-003 is of similar size to the replicate spread.',
    limitations:
      'Only three dosage levels were tested, and the 100 ppm replicate differs by 1 point. The shape of the response between 100 and 150 ppm is not characterised.',
    nextAction: 'Review a proposed intermediate-dosage test at 115 ppm.',
    unknowns: ['Response between 100 and 150 ppm', 'Whether the plateau holds at other temperatures', 'Repeatability of the 150 ppm point (single test)'],
    recommendationId: 'REC-001',
  },
  {
    id: 'INS-002',
    category: 'formulation',
    workflow: 'demulsifier',
    title: 'DM-B205 recorded a higher separation than DM-A101 at 100 ppm',
    observation:
      'For matched conditions (CR-101, 60 °C, 30 min, 100 ppm), DM-B205 recorded 87 % water separation versus 82 % and 81 % for DM-A101 replicates.',
    formulationIds: ['DM-A101', 'DM-B205'],
    experimentIds: ['DEM-002', 'DEM-004', 'DEM-009'],
    conditions: 'CR-101 · 100 ppm · 60 °C · 30 min settling',
    explanation:
      'These experiments show a higher observed value for DM-B205 within this matched set. This is a statement about the recorded tests only, not a ranking of the chemistries.',
    limitations:
      'DM-B205 has one test at this condition set. Results on other crude samples (for example CR-202) differ in magnitude and were not matched on every variable.',
    nextAction: 'Consider a replicate of DEM-004 and an intermediate B205 dosage test.',
    unknowns: ['Repeatability of the DM-B205 100 ppm result', 'Behaviour on other crude samples under matched conditions'],
    recommendationId: 'REC-002',
  },
  {
    id: 'INS-003',
    category: 'temperature',
    workflow: 'demulsifier',
    title: 'Recorded separation differs across tested temperatures',
    observation:
      'For DM-A101 at 100 ppm on CR-101 (30 min), recorded separation was 72 % at 55 °C, 81–82 % at 60 °C, 86 % at 65 °C and 87 % at 70 °C.',
    formulationIds: ['DM-A101', 'DM-B205'],
    experimentIds: ['DEM-006', 'DEM-002', 'DEM-009', 'DEM-010', 'DEM-011', 'DEM-017', 'DEM-018'],
    conditions: 'CR-101 · 100 ppm · 30 min settling · 55–70 °C',
    explanation:
      'Different temperatures appear associated with different outcomes in the illustrative records. The change between 65 °C and 70 °C is smaller than between 55 °C and 60 °C.',
    limitations:
      'Each temperature has a single test (60 °C has a replicate). Associations here should not be read as proof of a causal temperature effect.',
    nextAction: 'Review coverage of intermediate temperatures before drawing conclusions.',
    unknowns: ['Replicate spread at 55, 65 and 70 °C', 'Interaction between temperature and dosage'],
  },
  {
    id: 'INS-004',
    category: 'settling',
    workflow: 'demulsifier',
    title: 'Longer settling times coincide with higher recorded separation',
    observation:
      'For DM-A101 at 100 ppm, recorded separation increased from 66 % (15 min) to 81–82 % (30 min), 88 % (45 min) and 90 % (60 min).',
    formulationIds: ['DM-A101', 'DM-B205'],
    experimentIds: ['DEM-007', 'DEM-002', 'DEM-009', 'DEM-012', 'DEM-013', 'DEM-019', 'DEM-020'],
    conditions: 'CR-101 · 100 ppm · 60 °C · 15–60 min settling',
    explanation:
      'Different settling times produce different recorded separation performance. Increments become smaller beyond 45 min for DM-A101.',
    limitations:
      'Settling times beyond 60 min were not tested. DM-B205 has no 60 min result and is marked Untested at that point.',
    nextAction: 'Decide whether additional settling-time points are needed for DM-B205.',
    unknowns: ['DM-B205 at 60 min', 'Practical settling time constraints in the field'],
  },
  {
    id: 'INS-005',
    category: 'similar',
    workflow: 'demulsifier',
    title: 'Different crude samples should not be compared directly',
    observation:
      'DM-A101 at 100 ppm, 60 °C and 30 min recorded 81–82 % on CR-101 (DEM-002, DEM-009) and 68 % on CR-202 (DEM-008).',
    formulationIds: ['DM-A101'],
    experimentIds: ['DEM-002', 'DEM-009', 'DEM-008'],
    conditions: '100 ppm · 60 °C · 30 min · CR-101 vs CR-202',
    explanation:
      'These experiments used different crude samples, so the observed separation difference cannot be attributed solely to the formulation. CR-202 is a heavier crude with a different water cut.',
    limitations: 'Crude characteristics (viscosity, asphaltene content, salinity) are not part of the matched set.',
    nextAction: 'Compare formulations only within the same crude sample.',
    unknowns: ['Which crude property drives the difference', 'Whether dosage should be scaled for heavier crude'],
  },
  {
    id: 'INS-006',
    category: 'similar',
    workflow: 'demulsifier',
    title: 'Repeated experiments allow a repeatability review',
    observation:
      'DEM-002 (82 %) and DEM-009 (81 %) were run under identical conditions, which gives one repeatability pair for DM-A101 at 100 ppm.',
    formulationIds: ['DM-A101'],
    experimentIds: ['DEM-002', 'DEM-009', 'DEM-035'],
    conditions: 'CR-101 · 100 ppm · 60 °C · 30 min settling',
    explanation:
      'The pair differs by 1 percentage point. A third replicate (DEM-035) is pending, which would give a slightly better view of spread.',
    limitations: 'Two replicates are not enough to estimate variability with any rigour.',
    nextAction: 'Complete DEM-035 and review spread across three replicates.',
    unknowns: ['Operator-to-operator variability', 'Batch-to-batch variability of the crude sample'],
    recommendationId: 'REC-003',
  },
  {
    id: 'INS-007',
    category: 'coverage',
    workflow: 'demulsifier',
    title: 'Intermediate DM-A101 dosages are untested',
    observation:
      'No DM-A101 experiments exist between 100 ppm and 150 ppm on CR-101 at 60 °C and 30 min. Dosage coverage is 50, 100 and 150 ppm only.',
    formulationIds: ['DM-A101'],
    experimentIds: ['DEM-002', 'DEM-003'],
    conditions: 'CR-101 · 60 °C · 30 min settling',
    explanation: 'The gap coincides with the region where recorded separation begins to flatten (INS-001).',
    limitations: 'Coverage gaps are not predictions. The untested region is not assumed to behave in any particular way.',
    nextAction: 'Review the proposed 115 ppm experiment.',
    unknowns: ['Any measured separation between 100 and 150 ppm'],
    recommendationId: 'REC-001',
  },
  {
    id: 'INS-008',
    category: 'coverage',
    workflow: 'demulsifier',
    title: 'DM-D412 and DM-E520 have narrow temperature coverage',
    observation:
      'DM-D412 and DM-E520 were only tested at 60 °C. DM-A101 and DM-B205 cover 55–70 °C and 55–65 °C respectively.',
    formulationIds: ['DM-D412', 'DM-E520'],
    experimentIds: ['DEM-026', 'DEM-027', 'DEM-029', 'DEM-030'],
    conditions: 'CR-101 / CR-404 · 60 °C · 30 min settling',
    explanation: 'Direct comparison across formulations at other temperatures is not possible with current records.',
    limitations: 'Different crude samples were used for DM-E520 (CR-404) and DM-D412 (CR-101).',
    nextAction: 'Consider a DM-D412 test at 65 °C to extend coverage.',
    unknowns: ['Temperature response of DM-D412 and DM-E520'],
    recommendationId: 'REC-006',
  },
  {
    id: 'INS-009',
    category: 'dosage',
    workflow: 'gasoline',
    title: 'Smaller RON increment at higher booster dosage for GB-A01',
    observation:
      'GB-A01 recorded 91.0 RON at 0 ppm, 92.2 at 200 ppm and 92.6 at 400 ppm. The second 200 ppm step added 0.4 RON versus 1.2 for the first.',
    formulationIds: ['ADD-OB7'],
    experimentIds: ['GAS-001', 'GAS-002', 'GAS-003', 'GAS-004'],
    conditions: 'GB-A01 · ADD-OB7',
    explanation: 'The illustrative records suggest a nonlinear dosage response in this blend family.',
    limitations: 'Single determinations. No measurement between 200 and 400 ppm. MON, RVP and distillation have not been evaluated.',
    nextAction: 'Review a proposed 300 ppm test.',
    unknowns: ['RON between 200 and 400 ppm', 'Effect on RVP and distillation'],
    recommendationId: 'REC-007',
  },
]

export const recommendations: Recommendation[] = [
  {
    id: 'REC-001',
    workflow: 'demulsifier',
    title: 'Explore an intermediate DM-A101 dosage',
    formulationId: 'DM-A101',
    crudeId: 'CR-101',
    dosagePpm: 115,
    tempC: 60,
    settlingMin: 30,
    rationale:
      'The available illustrative records show only a small measured separation difference between 100 and 150 ppm, while intermediate dosage coverage is limited.',
    coverageGap: 'No DM-A101 test between 100 and 150 ppm on CR-101 at 60 °C / 30 min.',
    value: 'Would show whether the apparent plateau begins before 150 ppm, informing dosage selection for further validation.',
    supportingExperimentIds: ['DEM-002', 'DEM-003', 'DEM-009'],
    limitations: 'A single test at 115 ppm will not characterise the curve. Replicates are advisable.',
    expectedNote: 'Illustrative expectation only: a value between the recorded 100 ppm (81–82 %) and 150 ppm (84 %) results. This is not a prediction.',
    status: 'Proposed',
  },
  {
    id: 'REC-002',
    workflow: 'demulsifier',
    title: 'Fill the 50–100 ppm gap for DM-B205',
    formulationId: 'DM-B205',
    crudeId: 'CR-101',
    dosagePpm: 75,
    tempC: 60,
    settlingMin: 30,
    rationale: 'DM-B205 recorded 70 % at 50 ppm and 87 % at 100 ppm. The region between is untested.',
    coverageGap: 'No DM-B205 test between 50 and 100 ppm on CR-101.',
    value: 'Provides a lower-dosage reference point for comparison against DM-A101.',
    supportingExperimentIds: ['DEM-004', 'DEM-005'],
    limitations: 'DEM-036 is already a draft entry at 75 ppm; confirm it is not duplicated.',
    status: 'Proposed',
  },
  {
    id: 'REC-003',
    workflow: 'demulsifier',
    title: 'Third replicate of DM-A101 at 100 ppm',
    formulationId: 'DM-A101',
    crudeId: 'CR-101',
    dosagePpm: 100,
    tempC: 60,
    settlingMin: 30,
    rationale: 'Two replicates (DEM-002, DEM-009) differ by 1 point. A third helps review repeatability.',
    coverageGap: 'Only two replicates at the reference condition.',
    value: 'Improves confidence in the reference value used by dosage and formulation comparisons.',
    supportingExperimentIds: ['DEM-002', 'DEM-009', 'DEM-035'],
    limitations: 'DEM-035 is already pending for this purpose. Review before adding a duplicate plan entry.',
    status: 'Under Review',
  },
  {
    id: 'REC-004',
    workflow: 'demulsifier',
    title: 'DM-B205 on CR-303 under matched conditions',
    formulationId: 'DM-B205',
    crudeId: 'CR-303',
    dosagePpm: 100,
    tempC: 60,
    settlingMin: 30,
    rationale: 'CR-303 has records for DM-A101 (pending), DM-C310 and DM-D412 but none for DM-B205.',
    coverageGap: 'DM-B205 not tested on CR-303.',
    value: 'Enables a matched formulation comparison on a lighter crude.',
    supportingExperimentIds: ['DEM-025', 'DEM-028'],
    limitations: 'Different crude samples limit comparison with CR-101 results.',
    status: 'Proposed',
  },
  {
    id: 'REC-005',
    workflow: 'demulsifier',
    title: 'Intermediate DM-C310 dosage near the 100–150 ppm range',
    formulationId: 'DM-C310',
    crudeId: 'CR-101',
    dosagePpm: 125,
    tempC: 60,
    settlingMin: 30,
    rationale: 'DM-C310 recorded 78 % at 100 ppm and 85 % at 150 ppm, a larger step than DM-A101 across the same range.',
    coverageGap: 'No DM-C310 test between 100 and 150 ppm.',
    value: 'Clarifies whether DM-C310 shows a similar plateau to DM-A101.',
    supportingExperimentIds: ['DEM-022', 'DEM-024'],
    limitations: 'Single tests at each dosage.',
    status: 'Proposed',
  },
  {
    id: 'REC-006',
    workflow: 'demulsifier',
    title: 'Extend DM-D412 temperature coverage to 65 °C',
    formulationId: 'DM-D412',
    crudeId: 'CR-101',
    dosagePpm: 100,
    tempC: 65,
    settlingMin: 30,
    rationale: 'DM-D412 has only been tested at 60 °C. DM-A101 and DM-B205 recorded higher values at 65 °C on CR-101.',
    coverageGap: 'DM-D412 untested above 60 °C.',
    value: 'Enables a temperature comparison across formulations on CR-101.',
    supportingExperimentIds: ['DEM-026', 'DEM-010', 'DEM-018'],
    limitations: 'The temperature association in other formulations does not imply the same behaviour for DM-D412.',
    status: 'Proposed',
  },
  {
    id: 'REC-007',
    workflow: 'gasoline',
    title: 'Intermediate OB-7 dosage on GB-A01',
    formulationId: 'ADD-OB7',
    crudeId: '',
    dosagePpm: 300,
    tempC: null,
    settlingMin: null,
    rationale: 'Observed RON increment shrinks between 200 and 400 ppm. 300 ppm has not been measured.',
    coverageGap: 'No GB-A01 measurement between 200 and 400 ppm.',
    value: 'Shows whether the RON gain flattens before 400 ppm.',
    supportingExperimentIds: ['GAS-003', 'GAS-004'],
    limitations: 'MON, RVP, density, distillation and sulfur remain unevaluated. Additional validation required.',
    additiveType: 'ADD-OB7',
    blendId: 'GB-A01',
    status: 'Proposed',
  },
]

export const plan: TestingPlanItem[] = [
  { id: 'PLN-001', workflow: 'demulsifier', title: 'DM-A101 on CR-303 at 100 ppm', formulationId: 'DM-A101', crudeId: 'CR-303', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech1', plannedDate: '2026-10-12', status: 'In Progress', supportingExperimentIds: ['DEM-025', 'DEM-028'], experimentId: 'DEM-032', notes: 'Fills the CR-303 gap for the reference formulation.' },
  { id: 'PLN-002', workflow: 'demulsifier', title: 'DM-B205 on CR-202 at 150 ppm', formulationId: 'DM-B205', crudeId: 'CR-202', dosagePpm: 150, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech2', plannedDate: '2026-10-09', status: 'Completed', supportingExperimentIds: ['DEM-021', 'DEM-015'], experimentId: 'DEM-033', notes: 'Residual water not measured; centrifuge unavailable.' },
  { id: 'PLN-003', workflow: 'demulsifier', title: 'DM-C310 on CR-404 at 100 ppm', formulationId: 'DM-C310', crudeId: 'CR-404', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech2', plannedDate: '2026-10-20', status: 'Scheduled', supportingExperimentIds: ['DEM-029'], experimentId: 'DEM-034', notes: '' },
  { id: 'PLN-004', workflow: 'demulsifier', title: 'DM-D412 on CR-101 at 150 ppm, 65 °C', formulationId: 'DM-D412', crudeId: 'CR-101', dosagePpm: 150, tempC: 65, settlingMin: 30, assigneeId: 'usr-tech3', plannedDate: '2026-10-22', status: 'Approved for Testing', supportingExperimentIds: ['DEM-026', 'DEM-027'], notes: 'Combined dosage and temperature extension; chemist to confirm.' },
  { id: 'PLN-005', workflow: 'demulsifier', title: 'DM-E520 on CR-303 at 100 ppm', formulationId: 'DM-E520', crudeId: 'CR-303', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: null, plannedDate: '2026-10-27', status: 'Proposed', supportingExperimentIds: ['DEM-029', 'DEM-028'], notes: '' },
  { id: 'PLN-006', workflow: 'demulsifier', title: 'DM-A101 replicate on CR-101 at 100 ppm', formulationId: 'DM-A101', crudeId: 'CR-101', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech1', plannedDate: '2026-10-15', status: 'Scheduled', supportingExperimentIds: ['DEM-002', 'DEM-009'], experimentId: 'DEM-035', recommendationId: 'REC-003', notes: 'Third replicate for repeatability review.' },
  { id: 'PLN-007', workflow: 'demulsifier', title: 'DM-B205 on CR-101 at 125 ppm', formulationId: 'DM-B205', crudeId: 'CR-101', dosagePpm: 125, tempC: 60, settlingMin: 30, assigneeId: null, plannedDate: '2026-10-28', status: 'Proposed', supportingExperimentIds: ['DEM-004', 'DEM-016'], notes: '' },
  { id: 'PLN-008', workflow: 'demulsifier', title: 'DM-A101 on CR-404 at 100 ppm', formulationId: 'DM-A101', crudeId: 'CR-404', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech3', plannedDate: '2026-10-14', status: 'Cancelled', supportingExperimentIds: ['DEM-029'], notes: 'Cancelled: sample CR-404-S1 reserved for DM-E520 series.' },
  { id: 'PLN-009', workflow: 'demulsifier', title: 'DM-C310 on CR-101 at 100 ppm, 70 °C', formulationId: 'DM-C310', crudeId: 'CR-101', dosagePpm: 100, tempC: 70, settlingMin: 30, assigneeId: 'usr-tech1', plannedDate: '2026-10-21', status: 'Approved for Testing', supportingExperimentIds: ['DEM-022', 'DEM-011'], notes: '' },
  { id: 'PLN-010', workflow: 'gasoline', title: 'GB-B02 with OB-7 at 300 ppm', formulationId: 'ADD-OB7', crudeId: '', dosagePpm: 300, tempC: null, settlingMin: null, assigneeId: 'usr-tech4', plannedDate: '2026-10-22', status: 'Scheduled', supportingExperimentIds: ['GAS-007', 'GAS-008'], experimentId: 'GAS-012', notes: 'Intermediate dosage for GB-B02.', additiveType: 'ADD-OB7', blendId: 'GB-B02' },
  { id: 'PLN-011', workflow: 'demulsifier', title: 'DM-D412 on CR-202 at 100 ppm', formulationId: 'DM-D412', crudeId: 'CR-202', dosagePpm: 100, tempC: 60, settlingMin: 30, assigneeId: 'usr-tech2', plannedDate: '2026-10-30', status: 'Proposed', supportingExperimentIds: ['DEM-008', 'DEM-021'], notes: '' },
]

export const templates: ExperimentTemplate[] = [
  {
    id: 'TPL-DEM',
    workflow: 'demulsifier',
    title: 'Standard Demulsifier Bottle Test',
    description: 'Default entry template for bottle tests with dosage, temperature and settling-time variation.',
    fields: [
      { key: 'formulationId', label: 'Formulation ID', enabled: true, required: true },
      { key: 'crudeId', label: 'Crude source', enabled: true, required: true },
      { key: 'dosagePpm', label: 'Chemical dosage', unit: 'ppm', enabled: true, required: true },
      { key: 'tempC', label: 'Temperature', unit: '°C', enabled: true, required: true },
      { key: 'settlingMin', label: 'Settling time', unit: 'min', enabled: true, required: true },
      { key: 'waterCutPct', label: 'Water cut', unit: '%', enabled: true, required: false },
      { key: 'mixing', label: 'Mixing conditions', enabled: true, required: false },
      { key: 'waterSepPct', label: 'Water separation', unit: '%', enabled: true, required: false },
      { key: 'residualWaterPct', label: 'Residual water (BS&W)', unit: '%', enabled: true, required: false },
      { key: 'ragLayer', label: 'Rag-layer observation', enabled: true, required: false },
      { key: 'clarity', label: 'Interface clarity', enabled: true, required: false },
    ],
  },
  {
    id: 'TPL-GAS',
    workflow: 'gasoline',
    title: 'Gasoline Blend Screening',
    description: 'Default entry template for blend composition, booster dosage and measured RON.',
    fields: [
      { key: 'blendId', label: 'Blend ID', enabled: true, required: true },
      { key: 'components', label: 'Base blend components', enabled: true, required: true },
      { key: 'additiveType', label: 'Booster / additive type', enabled: true, required: true },
      { key: 'boosterPpm', label: 'Booster dosage', unit: 'ppm', enabled: true, required: true },
      { key: 'ron', label: 'Measured RON', unit: 'RON', enabled: true, required: false },
      { key: 'observations', label: 'Laboratory observations', enabled: true, required: false },
    ],
  },
]

export const dataFields: DataField[] = [
  { key: 'dosagePpm', label: 'Chemical Dosage', unit: 'ppm', workflow: 'demulsifier', locked: true, description: 'Unit is locked because 100% of existing records are stored in ppm.' },
  { key: 'tempC', label: 'Test Temperature', unit: '°C', workflow: 'demulsifier', locked: true, description: 'Unit is locked to avoid silent conversion of recorded values.' },
  { key: 'settlingMin', label: 'Settling Time', unit: 'min', workflow: 'demulsifier', locked: true, description: 'Stored in minutes.' },
  { key: 'waterSepPct', label: 'Water Separation', unit: '%', workflow: 'demulsifier', locked: true, description: 'Percentage of emulsified water separated.' },
  { key: 'residualWaterPct', label: 'Residual Water / BS&W', unit: '%', workflow: 'demulsifier', locked: true, description: 'Residual water in the oil phase.' },
  { key: 'ragLayer', label: 'Rag-Layer Observation', unit: 'text', workflow: 'demulsifier', locked: false, description: 'Free-text observation. Label may be edited.' },
  { key: 'clarity', label: 'Oil-Water Interface Clarity', unit: 'text', workflow: 'demulsifier', locked: false, description: 'Free-text observation. Label may be edited.' },
  { key: 'boosterPpm', label: 'Booster Dosage', unit: 'ppm', workflow: 'gasoline', locked: true, description: 'Unit locked.' },
  { key: 'ron', label: 'Measured RON', unit: 'RON', workflow: 'gasoline', locked: true, description: 'Research Octane Number.' },
]

export const activity: ActivityEvent[] = [
  { id: 'ACT-014', at: '2026-10-13T09:10:00', type: 'test-scheduled', actorId: 'usr-labmgr', text: 'PLN-006 scheduled for 15 Oct with Daniel Okafor', href: '/testing-plan' },
  { id: 'ACT-013', at: '2026-10-13T08:42:00', type: 'formulation-reviewed', actorId: 'usr-chem1', text: 'Reviewed DM-A101 dosage response on CR-101', href: '/analysis/demulsifier' },
  { id: 'ACT-012', at: '2026-10-12T16:05:00', type: 'recommendation-accepted', actorId: 'usr-chem2', text: 'Accepted REC-007 concept for GB-B02 and created PLN-010', href: '/testing-plan' },
  { id: 'ACT-011', at: '2026-10-12T14:20:00', type: 'results-recorded', actorId: 'usr-tech2', text: 'Results recorded for DEM-033 (residual water not measured)', href: '/experiments/DEM-033' },
  { id: 'ACT-010', at: '2026-10-12T09:30:00', type: 'experiment-added', actorId: 'usr-tech1', text: 'DEM-032 started: DM-A101 on CR-303 at 100 ppm', href: '/experiments/DEM-032' },
  { id: 'ACT-009', at: '2026-10-11T11:32:00', type: 'experiment-added', actorId: 'usr-tech3', text: 'DEM-031 added: DM-E520 on CR-101 at 100 ppm', href: '/experiments/DEM-031' },
  { id: 'ACT-008', at: '2026-10-10T15:44:00', type: 'formulation-reviewed', actorId: 'usr-rdmgr', text: 'Reviewed DM-C310 and DM-D412 comparison', href: '/comparison' },
  { id: 'ACT-007', at: '2026-10-09T10:12:00', type: 'results-recorded', actorId: 'usr-tech2', text: 'DEM-030 recorded: 72 % water separation', href: '/experiments/DEM-030' },
  { id: 'ACT-006', at: '2026-10-05T13:00:00', type: 'dataset-imported', actorId: 'usr-chem1', text: 'Imported Gasoline Blend Screening Results (12 rows)', href: '/analysis/gasoline' },
  { id: 'ACT-005', at: '2026-10-03T10:05:00', type: 'dataset-imported', actorId: 'usr-chem1', text: 'Imported Historical Crude Separation Trials (9 rows)', href: '/experiments' },
  { id: 'ACT-004', at: '2026-10-02T14:40:00', type: 'config-changed', actorId: 'usr-admin', text: 'Formulation DM-E520 status set to Under Evaluation', href: '/admin/chemicals' },
  { id: 'ACT-003', at: '2026-10-01T09:15:00', type: 'dataset-imported', actorId: 'usr-chem1', text: 'Imported Demulsifier Bottle Tests — September 2026 (27 rows)', href: '/experiments' },
  { id: 'ACT-002', at: '2026-09-30T16:20:00', type: 'user-changed', actorId: 'usr-admin', text: 'Added technician Fatima Al-Mansouri to Fuel Additives Laboratory', href: '/admin/users' },
  { id: 'ACT-001', at: '2026-09-28T08:50:00', type: 'config-changed', actorId: 'usr-admin', text: 'Enabled bottle-test template TPL-DEM', href: '/admin/chemicals' },
]

export const roleDefaultUser: Record<string, string> = {
  chemist: 'usr-chem1',
  technician: 'usr-tech1',
  'lab-manager': 'usr-labmgr',
  'rd-manager': 'usr-rdmgr',
  'tech-manager': 'usr-techmgr',
  admin: 'usr-admin',
}

export type RoleId =
  | 'chemist'
  | 'technician'
  | 'lab-manager'
  | 'rd-manager'
  | 'tech-manager'
  | 'admin'

export type WorkflowId = 'demulsifier' | 'gasoline'

export type UserStatus = 'Active' | 'Disabled'

export interface User {
  id: string
  name: string
  email: string
  role: RoleId
  area: string
  status: UserStatus
  lastActivity: string
}

export interface ChemicalCategory {
  id: string
  name: string
  workflow: WorkflowId
  description: string
  active: boolean
}

export type FormulationStatus = 'Active' | 'Under Evaluation' | 'Archived'

export interface Formulation {
  id: string
  name: string
  categoryId: string
  description: string
  status: FormulationStatus
  color: string
}

export interface CrudeSample {
  id: string
  name: string
  sampleId: string
  waterCutPct: number
  apiGravity: number
  notes: string
}

export type ExperimentStatus =
  | 'Draft'
  | 'Planned'
  | 'Pending'
  | 'In Progress'
  | 'Under Review'
  | 'Completed'
  | 'Cancelled'

export type ExperimentSource = 'seed' | 'import' | 'manual' | 'plan' | 'duplicate'

/** `null` always means "Not measured" and is never coerced to zero. */
export interface Experiment {
  id: string
  workflow: 'demulsifier'
  testDate: string
  datasetId: string
  formulationId: string
  crudeId: string
  sampleId: string
  dosagePpm: number | null
  tempC: number | null
  settlingMin: number | null
  waterCutPct: number | null
  mixing: string
  waterSepPct: number | null
  residualWaterPct: number | null
  ragLayer: string | null
  clarity: string | null
  observations: string
  notes: string
  technicianId: string
  status: ExperimentStatus
  source: ExperimentSource
  planId?: string
  duplicatedFrom?: string
}

export interface BlendComponent {
  name: string
  pct: number
}

export interface GasolineBlend {
  id: string
  name: string
  components: BlendComponent[]
  color: string
  description: string
}

export interface GasolineExperiment {
  id: string
  workflow: 'gasoline'
  testDate: string
  datasetId: string
  blendId: string
  components: BlendComponent[]
  additiveType: string
  boosterPpm: number | null
  ron: number | null
  observations: string
  technicianId: string
  status: ExperimentStatus
  source: ExperimentSource
  planId?: string
}

export interface HistoricalDataset {
  id: string
  name: string
  workflow: WorkflowId
  rows: number
  description: string
  importedAt: string
  source: string
}

export type InsightCategory =
  | 'dosage'
  | 'formulation'
  | 'temperature'
  | 'settling'
  | 'similar'
  | 'coverage'

export interface AnalyticalInsight {
  id: string
  category: InsightCategory
  workflow: WorkflowId
  title: string
  observation: string
  formulationIds: string[]
  experimentIds: string[]
  conditions: string
  explanation: string
  limitations: string
  nextAction: string
  unknowns: string[]
  recommendationId?: string
}

export type RecommendationStatus =
  | 'Proposed'
  | 'Under Review'
  | 'Added to Plan'
  | 'Rejected'

export interface Recommendation {
  id: string
  workflow: WorkflowId
  title: string
  formulationId: string
  crudeId: string
  dosagePpm: number
  tempC: number | null
  settlingMin: number | null
  rationale: string
  coverageGap: string
  value: string
  supportingExperimentIds: string[]
  limitations: string
  expectedNote?: string
  status: RecommendationStatus
  modified?: boolean
  rejectionReason?: string
  planId?: string
  /** Gasoline recommendations only */
  additiveType?: string
  blendId?: string
}

export type PlanStatus =
  | 'Proposed'
  | 'Approved for Testing'
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'

export interface TestingPlanItem {
  id: string
  workflow: WorkflowId
  title: string
  formulationId: string
  crudeId: string
  dosagePpm: number
  tempC: number | null
  settlingMin: number | null
  assigneeId: string | null
  plannedDate: string
  status: PlanStatus
  supportingExperimentIds: string[]
  experimentId?: string
  recommendationId?: string
  notes: string
  additiveType?: string
  blendId?: string
}

export interface ActivityEvent {
  id: string
  at: string
  type:
    | 'experiment-added'
    | 'results-recorded'
    | 'formulation-reviewed'
    | 'recommendation-accepted'
    | 'test-scheduled'
    | 'dataset-imported'
    | 'config-changed'
    | 'user-changed'
    | 'report'
  actorId: string
  text: string
  href?: string
}

export interface ExperimentTemplateField {
  key: string
  label: string
  unit?: string
  enabled: boolean
  required: boolean
}

export interface ExperimentTemplate {
  id: string
  workflow: WorkflowId
  title: string
  description: string
  fields: ExperimentTemplateField[]
}

export interface DataField {
  key: string
  label: string
  unit: string
  workflow: WorkflowId | 'shared'
  locked: boolean
  description: string
}

export interface ReportItem {
  id: string
  kind: 'insight' | 'comparison' | 'analysis-view' | 'experiment'
  title: string
  detail: string
  refs: string[]
  addedAt: string
}

export interface ReportConfig {
  workflow: WorkflowId
  datasetId: string
  formulationIds: string[]
  crudeIds: string[]
  dateFrom: string
  dateTo: string
  includeCharts: boolean
  includeInsights: boolean
  includeRecommendations: boolean
  notes: string
  title: string
}

export interface ImportResult {
  datasetId: string
  added: number
  skipped: number
  flagged: number
  addedIds: string[]
  skippedReasons: { row: number; reason: string }[]
  flaggedReasons: { row: number; reason: string }[]
  at: string
}

export interface CustomImportSource {
  fileName: string
  workflow: WorkflowId
  columns: string[]
  rows: Record<string, string>[]
}

export interface ImportSession {
  datasetId: string | null
  customSource: CustomImportSource | null
  fileName: string | null
  fileKind: string | null
  mapping: Record<string, string>
  unitConfirmed: boolean
  validated: boolean
  result: ImportResult | null
}

export interface CompareState {
  formulationIds: string[]
  experimentIds: string[]
}

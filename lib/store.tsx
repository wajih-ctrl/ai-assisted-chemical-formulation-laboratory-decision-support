'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActivityEvent,
  AnalyticalInsight,
  ChemicalCategory,
  CompareState,
  CrudeSample,
  DataField,
  Experiment,
  ExperimentStatus,
  ExperimentTemplate,
  Formulation,
  GasolineBlend,
  GasolineExperiment,
  HistoricalDataset,
  ImportSession,
  PlanStatus,
  Recommendation,
  ReportConfig,
  ReportItem,
  RoleId,
  TestingPlanItem,
  User,
  WorkflowId,
} from './types'
import * as seed from './seed'
import { nextExperimentId, nextId } from './analysis'

export interface AppState {
  roleId: RoleId
  userId: string
  workflow: WorkflowId
  users: User[]
  categories: ChemicalCategory[]
  formulations: Formulation[]
  crudes: CrudeSample[]
  experiments: Experiment[]
  gasoline: GasolineExperiment[]
  blends: GasolineBlend[]
  datasets: HistoricalDataset[]
  insights: AnalyticalInsight[]
  recommendations: Recommendation[]
  plan: TestingPlanItem[]
  templates: ExperimentTemplate[]
  dataFields: DataField[]
  activity: ActivityEvent[]
  compare: CompareState
  reportItems: ReportItem[]
  reportDraft: ReportConfig
  reportGenerated: ReportConfig | null
  importSession: ImportSession
  lastImportIds: string[]
}

export interface ResultsInput {
  waterSepPct: number | null
  residualWaterPct: number | null
  ragLayer: string | null
  clarity: string | null
  observations: string
  notes: string
  ron?: number | null
  markCompleted: boolean
}

const defaultReport = (): ReportConfig => ({
  workflow: 'demulsifier',
  datasetId: 'all',
  formulationIds: ['DM-A101', 'DM-B205'],
  crudeIds: ['CR-101'],
  dateFrom: '2026-09-01',
  dateTo: '2026-10-13',
  includeCharts: true,
  includeInsights: true,
  includeRecommendations: true,
  notes: '',
  title: 'Demulsifier Bottle-Test Review: DM-A101 and DM-B205 on CR-101',
})

const emptyImport = (): ImportSession => ({
  datasetId: null,
  customSource: null,
  fileName: null,
  fileKind: null,
  mapping: {},
  unitConfirmed: false,
  validated: false,
  result: null,
})

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function seedData(): Omit<AppState, 'roleId' | 'userId' | 'workflow'> {
  return {
    users: clone(seed.users),
    categories: clone(seed.categories),
    formulations: clone(seed.formulations),
    crudes: clone(seed.crudes),
    experiments: seed.buildExperiments(),
    gasoline: seed.buildGasolineExperiments(),
    blends: clone(seed.blends),
    datasets: clone(seed.datasets),
    insights: clone(seed.insights),
    recommendations: clone(seed.recommendations),
    plan: clone(seed.plan),
    templates: clone(seed.templates),
    dataFields: clone(seed.dataFields),
    activity: clone(seed.activity),
    compare: { formulationIds: ['DM-A101', 'DM-B205'], experimentIds: [] },
    reportItems: [],
    reportDraft: defaultReport(),
    reportGenerated: defaultReport(),
    importSession: emptyImport(),
    lastImportIds: [],
  }
}

export function initialState(): AppState {
  return { roleId: 'chemist', userId: seed.roleDefaultUser.chemist, workflow: 'demulsifier', ...seedData() }
}

function nowStamp(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${seed.TODAY_ISO}T${hh}:${mm}:00`
}

export interface Actions {
  login: (role: RoleId) => void
  setWorkflow: (w: WorkflowId) => void
  log: (type: ActivityEvent['type'], text: string, href?: string) => void
  addExperiment: (e: Omit<Experiment, 'id'> & { id?: string }) => string
  updateExperiment: (id: string, patch: Partial<Experiment>) => void
  addGasoline: (e: Omit<GasolineExperiment, 'id'> & { id?: string }) => string
  updateGasoline: (id: string, patch: Partial<GasolineExperiment>) => void
  addExperiments: (list: Experiment[], gas: GasolineExperiment[]) => void
  duplicateExperiment: (id: string) => string | null
  nextDemId: () => string
  nextGasId: () => string
  toggleCompareExperiment: (id: string) => void
  setCompareFormulations: (ids: string[]) => void
  addCompareFormulation: (id: string) => void
  removeCompareFormulation: (id: string) => void
  clearCompare: () => void
  addReportItem: (item: Omit<ReportItem, 'id' | 'addedAt'>) => void
  removeReportItem: (id: string) => void
  setReportDraft: (patch: Partial<ReportConfig>) => void
  generateReport: () => void
  resetReport: () => void
  updateRecommendation: (id: string, patch: Partial<Recommendation>) => void
  rejectRecommendation: (id: string, reason: string) => void
  restoreRecommendation: (id: string) => void
  addRecommendationToPlan: (id: string, opts: { assigneeId: string | null; plannedDate: string }) => string | null
  addPlanItem: (item: Omit<TestingPlanItem, 'id'>) => string
  addPlanFromExperiment: (expId: string) => string | null
  updatePlanItem: (id: string, patch: Partial<TestingPlanItem>) => void
  assignPlan: (id: string, userId: string | null) => void
  setPlanStatus: (id: string, status: PlanStatus) => string | null
  enterResults: (planId: string, input: ResultsInput) => string | null
  setImportSession: (patch: Partial<ImportSession>) => void
  resetImportSession: () => void
  upsertUser: (u: User) => void
  upsertFormulation: (f: Formulation) => void
  upsertCategory: (c: ChemicalCategory) => void
  upsertDataset: (d: HistoricalDataset) => void
  updateTemplate: (t: ExperimentTemplate) => void
  updateDataField: (key: string, patch: Partial<DataField>) => void
  resetDemo: () => void
  markInsightInReport: (id: string) => void
}

interface Ctx {
  state: AppState
  actions: Actions
  hydrated: boolean
}

const StoreContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'strata-lab-session-v2'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const ref = useRef(state)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppState
        ref.current = parsed
        setState(parsed)
      }
    } catch {
      /* ignore corrupted session */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable */
    }
  }, [state, hydrated])

  const commit = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(ref.current)
    ref.current = next
    setState(next)
  }, [])

  const actions = useMemo<Actions>(() => {
    const get = () => ref.current

    const withLog = (s: AppState, type: ActivityEvent['type'], text: string, href?: string): AppState => ({
      ...s,
      activity: [
        { id: `ACT-${String(s.activity.length + 1).padStart(3, '0')}-${Date.now() % 100000}`, at: nowStamp(), type, actorId: s.userId, text, href },
        ...s.activity,
      ],
    })

    const ensureLinkedExperiment = (s: AppState, p: TestingPlanItem, status: ExperimentStatus): { s: AppState; p: TestingPlanItem } => {
      if (p.workflow === 'demulsifier') {
        if (p.experimentId && s.experiments.some((e) => e.id === p.experimentId)) {
          return {
            s: { ...s, experiments: s.experiments.map((e) => (e.id === p.experimentId ? { ...e, status, technicianId: p.assigneeId ?? e.technicianId, planId: p.id } : e)) },
            p,
          }
        }
        const crude = s.crudes.find((c) => c.id === p.crudeId)
        const id = nextExperimentId(s.experiments.map((e) => e.id), 'DEM')
        const exp: Experiment = {
          id,
          workflow: 'demulsifier',
          testDate: p.plannedDate,
          datasetId: 'DS-001',
          formulationId: p.formulationId,
          crudeId: p.crudeId,
          sampleId: crude?.sampleId ?? '',
          dosagePpm: p.dosagePpm,
          tempC: p.tempC,
          settlingMin: p.settlingMin,
          waterCutPct: crude?.waterCutPct ?? null,
          mixing: seed.MIXING_DEFAULT,
          waterSepPct: null,
          residualWaterPct: null,
          ragLayer: null,
          clarity: null,
          observations: 'No results recorded yet.',
          notes: `Created from testing plan ${p.id}.`,
          technicianId: p.assigneeId ?? s.userId,
          status,
          source: 'plan',
          planId: p.id,
        }
        const np = { ...p, experimentId: id }
        return { s: { ...s, experiments: [exp, ...s.experiments], plan: s.plan.map((x) => (x.id === p.id ? np : x)) }, p: np }
      }
      if (p.experimentId && s.gasoline.some((e) => e.id === p.experimentId)) {
        return {
          s: { ...s, gasoline: s.gasoline.map((e) => (e.id === p.experimentId ? { ...e, status, technicianId: p.assigneeId ?? e.technicianId, planId: p.id } : e)) },
          p,
        }
      }
      const blend = s.blends.find((b) => b.id === p.blendId) ?? s.blends[0]
      const id = nextExperimentId(s.gasoline.map((e) => e.id), 'GAS')
      const exp: GasolineExperiment = {
        id,
        workflow: 'gasoline',
        testDate: p.plannedDate,
        datasetId: 'DS-003',
        blendId: blend.id,
        components: blend.components.map((c) => ({ ...c })),
        additiveType: p.additiveType ?? 'ADD-OB7',
        boosterPpm: p.dosagePpm,
        ron: null,
        observations: 'No results recorded yet.',
        technicianId: p.assigneeId ?? s.userId,
        status,
        source: 'plan',
        planId: p.id,
      }
      const np = { ...p, experimentId: id }
      return { s: { ...s, gasoline: [exp, ...s.gasoline], plan: s.plan.map((x) => (x.id === p.id ? np : x)) }, p: np }
    }

    const a: Actions = {
      login: (role) =>
        commit((s) => ({ ...s, roleId: role, userId: seed.roleDefaultUser[role] ?? s.userId })),
      setWorkflow: (w) => commit((s) => ({ ...s, workflow: w })),
      log: (type, text, href) => commit((s) => withLog(s, type, text, href)),

      nextDemId: () => nextExperimentId(get().experiments.map((e) => e.id), 'DEM'),
      nextGasId: () => nextExperimentId(get().gasoline.map((e) => e.id), 'GAS'),

      addExperiment: (e) => {
        const id = e.id ?? nextExperimentId(get().experiments.map((x) => x.id), 'DEM')
        commit((s) =>
          withLog({ ...s, experiments: [{ ...e, id } as Experiment, ...s.experiments] }, 'experiment-added', `${id} added: ${e.formulationId} at ${e.dosagePpm ?? 'n/a'} ppm (${e.status})`, `/experiments/${id}`),
        )
        return id
      },
      updateExperiment: (id, patch) =>
        commit((s) => {
          const prev = s.experiments.find((e) => e.id === id)
          let next: AppState = { ...s, experiments: s.experiments.map((e) => (e.id === id ? { ...e, ...patch } : e)) }
          if (prev && patch.waterSepPct !== undefined && prev.waterSepPct === null && patch.waterSepPct !== null)
            next = withLog(next, 'results-recorded', `Results recorded for ${id}: ${patch.waterSepPct} % water separation`, `/experiments/${id}`)
          return next
        }),
      addGasoline: (e) => {
        const id = e.id ?? nextExperimentId(get().gasoline.map((x) => x.id), 'GAS')
        commit((s) => withLog({ ...s, gasoline: [{ ...e, id } as GasolineExperiment, ...s.gasoline] }, 'experiment-added', `${id} added: ${e.blendId} at ${e.boosterPpm ?? 'n/a'} ppm`, `/experiments/${id}`))
        return id
      },
      updateGasoline: (id, patch) => commit((s) => ({ ...s, gasoline: s.gasoline.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      addExperiments: (list, gas) =>
        commit((s) => ({
          ...s,
          experiments: [...list, ...s.experiments],
          gasoline: [...gas, ...s.gasoline],
          lastImportIds: [...list.map((e) => e.id), ...gas.map((e) => e.id)],
        })),
      duplicateExperiment: (id) => {
        const s0 = get()
        const dem = s0.experiments.find((e) => e.id === id)
        if (dem) {
          const newId = nextExperimentId(s0.experiments.map((e) => e.id), 'DEM')
          commit((s) =>
            withLog(
              {
                ...s,
                experiments: [
                  { ...dem, id: newId, status: 'Draft', waterSepPct: null, residualWaterPct: null, ragLayer: null, clarity: null, observations: 'No results recorded yet.', notes: `Duplicated from ${id}.`, source: 'duplicate', duplicatedFrom: id, planId: undefined, technicianId: s.userId, testDate: seed.TODAY_ISO },
                  ...s.experiments,
                ],
              },
              'experiment-added',
              `${newId} created as a draft duplicate of ${id}`,
              `/experiments/${newId}`,
            ),
          )
          return newId
        }
        const gas = s0.gasoline.find((e) => e.id === id)
        if (gas) {
          const newId = nextExperimentId(s0.gasoline.map((e) => e.id), 'GAS')
          commit((s) =>
            withLog(
              { ...s, gasoline: [{ ...gas, id: newId, status: 'Draft', ron: null, observations: `Duplicated from ${id}.`, source: 'duplicate', planId: undefined, technicianId: s.userId, testDate: seed.TODAY_ISO }, ...s.gasoline] },
              'experiment-added',
              `${newId} created as a draft duplicate of ${id}`,
              `/experiments/${newId}`,
            ),
          )
          return newId
        }
        return null
      },

      toggleCompareExperiment: (id) =>
        commit((s) => {
          const has = s.compare.experimentIds.includes(id)
          const exp = s.experiments.find((e) => e.id === id)
          const experimentIds = has ? s.compare.experimentIds.filter((x) => x !== id) : [...s.compare.experimentIds, id]
          let formulationIds = s.compare.formulationIds
          if (!has && exp && !formulationIds.includes(exp.formulationId)) formulationIds = [...formulationIds, exp.formulationId].slice(-4)
          return { ...s, compare: { experimentIds, formulationIds } }
        }),
      setCompareFormulations: (ids) => commit((s) => ({ ...s, compare: { ...s.compare, formulationIds: ids.slice(0, 4) } })),
      addCompareFormulation: (id) =>
        commit((s) =>
          s.compare.formulationIds.includes(id) || s.compare.formulationIds.length >= 4
            ? s
            : { ...s, compare: { ...s.compare, formulationIds: [...s.compare.formulationIds, id] } },
        ),
      removeCompareFormulation: (id) =>
        commit((s) => ({ ...s, compare: { ...s.compare, formulationIds: s.compare.formulationIds.filter((x) => x !== id) } })),
      clearCompare: () => commit((s) => ({ ...s, compare: { formulationIds: ['DM-A101', 'DM-B205'], experimentIds: [] } })),

      addReportItem: (item) =>
        commit((s) => ({
          ...s,
          reportItems: [{ ...item, id: `RI-${s.reportItems.length + 1}-${Date.now() % 10000}`, addedAt: nowStamp() }, ...s.reportItems],
        })),
      removeReportItem: (id) => commit((s) => ({ ...s, reportItems: s.reportItems.filter((r) => r.id !== id) })),
      markInsightInReport: () => undefined,
      setReportDraft: (patch) => commit((s) => ({ ...s, reportDraft: { ...s.reportDraft, ...patch } })),
      generateReport: () => commit((s) => withLog({ ...s, reportGenerated: clone(s.reportDraft) }, 'report', `Report preview generated: ${s.reportDraft.title}`, '/reports')),
      resetReport: () => commit((s) => ({ ...s, reportDraft: defaultReport(), reportGenerated: defaultReport(), reportItems: [] })),

      updateRecommendation: (id, patch) => commit((s) => ({ ...s, recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      rejectRecommendation: (id, reason) =>
        commit((s) =>
          withLog(
            { ...s, recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, status: 'Rejected', rejectionReason: reason } : r)) },
            'formulation-reviewed',
            `${id} rejected by chemist: ${reason || 'no reason given'}`,
            '/recommendations',
          ),
        ),
      restoreRecommendation: (id) =>
        commit((s) => ({ ...s, recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, status: 'Proposed', rejectionReason: undefined } : r)) })),
      addRecommendationToPlan: (id, opts) => {
        const s0 = get()
        const rec = s0.recommendations.find((r) => r.id === id)
        if (!rec) return null
        const planId = nextId(s0.plan.map((p) => p.id), 'PLN')
        commit((s) => {
          const item: TestingPlanItem = {
            id: planId,
            workflow: rec.workflow,
            title: rec.title,
            formulationId: rec.formulationId,
            crudeId: rec.crudeId,
            dosagePpm: rec.dosagePpm,
            tempC: rec.tempC,
            settlingMin: rec.settlingMin,
            assigneeId: opts.assigneeId,
            plannedDate: opts.plannedDate,
            status: 'Proposed',
            supportingExperimentIds: rec.supportingExperimentIds,
            recommendationId: rec.id,
            notes: rec.rationale,
            additiveType: rec.additiveType,
            blendId: rec.blendId,
          }
          return withLog(
            {
              ...s,
              plan: [item, ...s.plan],
              recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, status: 'Added to Plan', planId } : r)),
            },
            'recommendation-accepted',
            `${id} accepted by chemist and added to the testing plan as ${planId}`,
            '/testing-plan',
          )
        })
        return planId
      },
      addPlanItem: (item) => {
        const planId = nextId(get().plan.map((p) => p.id), 'PLN')
        commit((s) => withLog({ ...s, plan: [{ ...item, id: planId }, ...s.plan] }, 'test-scheduled', `${planId} added to the testing plan: ${item.title}`, '/testing-plan'))
        return planId
      },
      addPlanFromExperiment: (expId) => {
        const s0 = get()
        const e = s0.experiments.find((x) => x.id === expId)
        if (!e) return null
        const planId = nextId(s0.plan.map((p) => p.id), 'PLN')
        const item: TestingPlanItem = {
          id: planId,
          workflow: 'demulsifier',
          title: `Follow-up to ${e.id}: ${e.formulationId} at ${e.dosagePpm ?? '?'} ppm`,
          formulationId: e.formulationId,
          crudeId: e.crudeId,
          dosagePpm: e.dosagePpm ?? 100,
          tempC: e.tempC,
          settlingMin: e.settlingMin,
          assigneeId: null,
          plannedDate: '2026-10-27',
          status: 'Proposed',
          supportingExperimentIds: [e.id],
          notes: `Created from ${e.id}.`,
        }
        commit((s) => withLog({ ...s, plan: [item, ...s.plan] }, 'test-scheduled', `${planId} created from ${e.id}`, '/testing-plan'))
        return planId
      },
      updatePlanItem: (id, patch) =>
        commit((s) => {
          const p = s.plan.find((x) => x.id === id)
          let next: AppState = { ...s, plan: s.plan.map((x) => (x.id === id ? { ...x, ...patch } : x)) }
          if (p?.experimentId && p.workflow === 'demulsifier') {
            next = {
              ...next,
              experiments: next.experiments.map((e) =>
                e.id === p.experimentId && e.status !== 'Completed'
                  ? {
                      ...e,
                      formulationId: patch.formulationId ?? e.formulationId,
                      crudeId: patch.crudeId ?? e.crudeId,
                      dosagePpm: patch.dosagePpm ?? e.dosagePpm,
                      tempC: patch.tempC === undefined ? e.tempC : patch.tempC,
                      settlingMin: patch.settlingMin === undefined ? e.settlingMin : patch.settlingMin,
                      testDate: patch.plannedDate ?? e.testDate,
                    }
                  : e,
              ),
            }
          }
          return next
        }),
      assignPlan: (id, userId) =>
        commit((s) => {
          const p = s.plan.find((x) => x.id === id)
          const u = s.users.find((x) => x.id === userId)
          let next: AppState = { ...s, plan: s.plan.map((x) => (x.id === id ? { ...x, assigneeId: userId } : x)) }
          if (p?.experimentId && userId) {
            next = {
              ...next,
              experiments: next.experiments.map((e) => (e.id === p.experimentId ? { ...e, technicianId: userId } : e)),
              gasoline: next.gasoline.map((e) => (e.id === p.experimentId ? { ...e, technicianId: userId } : e)),
            }
          }
          return withLog(next, 'test-scheduled', userId ? `${id} assigned to ${u?.name ?? userId}` : `${id} technician removed`, '/testing-plan')
        }),
      setPlanStatus: (id, status) => {
        let linked: string | null = null
        commit((s) => {
          const p = s.plan.find((x) => x.id === id)
          if (!p) return s
          let next: AppState = { ...s, plan: s.plan.map((x) => (x.id === id ? { ...x, status } : x)) }
          const cur = { ...p, status }
          if (status === 'Scheduled' || status === 'In Progress') {
            const r = ensureLinkedExperiment(next, cur, status === 'In Progress' ? 'In Progress' : 'Planned')
            next = r.s
            linked = r.p.experimentId ?? null
          } else if (status === 'Cancelled' && p.experimentId) {
            next = {
              ...next,
              experiments: next.experiments.map((e) => (e.id === p.experimentId && e.status !== 'Completed' ? { ...e, status: 'Cancelled' } : e)),
              gasoline: next.gasoline.map((e) => (e.id === p.experimentId && e.status !== 'Completed' ? { ...e, status: 'Cancelled' } : e)),
            }
            linked = p.experimentId
          } else linked = p.experimentId ?? null
          return withLog(next, 'test-scheduled', `${id} moved to ${status}`, '/testing-plan')
        })
        return linked
      },
      enterResults: (planId, input) => {
        let expId: string | null = null
        commit((s) => {
          const p = s.plan.find((x) => x.id === planId)
          if (!p) return s
          let next: AppState = s
          let cur = p
          if (!p.experimentId) {
            const r = ensureLinkedExperiment(next, p, 'In Progress')
            next = r.s
            cur = r.p
          }
          expId = cur.experimentId ?? null
          const status: ExperimentStatus = input.markCompleted ? 'Completed' : 'Under Review'
          if (cur.workflow === 'demulsifier') {
            next = {
              ...next,
              experiments: next.experiments.map((e) =>
                e.id === expId
                  ? { ...e, waterSepPct: input.waterSepPct, residualWaterPct: input.residualWaterPct, ragLayer: input.ragLayer, clarity: input.clarity, observations: input.observations || e.observations, notes: input.notes || e.notes, status }
                  : e,
              ),
            }
          } else {
            next = {
              ...next,
              gasoline: next.gasoline.map((e) => (e.id === expId ? { ...e, ron: input.ron ?? null, observations: input.observations || e.observations, status } : e)),
            }
          }
          next = { ...next, plan: next.plan.map((x) => (x.id === planId ? { ...x, status: 'Completed' } : x)) }
          return withLog(next, 'results-recorded', `Results recorded for ${expId} from ${planId}`, `/experiments/${expId}`)
        })
        return expId
      },

      setImportSession: (patch) => commit((s) => ({ ...s, importSession: { ...s.importSession, ...patch } })),
      resetImportSession: () => commit((s) => ({ ...s, importSession: emptyImport() })),

      upsertUser: (u) =>
        commit((s) => {
          const exists = s.users.some((x) => x.id === u.id)
          return withLog(
            { ...s, users: exists ? s.users.map((x) => (x.id === u.id ? u : x)) : [...s.users, u] },
            'user-changed',
            exists ? `User ${u.name} updated (${u.role}, ${u.status})` : `Demo user ${u.name} added`,
            '/admin/users',
          )
        }),
      upsertFormulation: (f) =>
        commit((s) => {
          const exists = s.formulations.some((x) => x.id === f.id)
          return withLog(
            { ...s, formulations: exists ? s.formulations.map((x) => (x.id === f.id ? f : x)) : [...s.formulations, f] },
            'config-changed',
            exists ? `Formulation ${f.id} updated (${f.status})` : `Formulation ${f.id} added`,
            '/admin/chemicals',
          )
        }),
      upsertCategory: (c) =>
        commit((s) => {
          const exists = s.categories.some((x) => x.id === c.id)
          return withLog(
            { ...s, categories: exists ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c] },
            'config-changed',
            exists ? `Category ${c.name} updated` : `Category ${c.name} added`,
            '/admin/chemicals',
          )
        }),
      upsertDataset: (d) =>
        commit((s) => {
          const exists = s.datasets.some((x) => x.id === d.id)
          return withLog(
            { ...s, datasets: exists ? s.datasets.map((x) => (x.id === d.id ? d : x)) : [...s.datasets, d] },
            'config-changed',
            exists ? `Dataset ${d.id} metadata updated` : `Demo dataset ${d.id} added`,
            '/admin',
          )
        }),
      updateTemplate: (t) =>
        commit((s) => withLog({ ...s, templates: s.templates.map((x) => (x.id === t.id ? t : x)) }, 'config-changed', `Template ${t.id} updated`, '/admin/chemicals')),
      updateDataField: (key, patch) =>
        commit((s) =>
          withLog(
            { ...s, dataFields: s.dataFields.map((f) => (f.key === key && !f.locked ? { ...f, ...patch } : f)) },
            'config-changed',
            `Data field ${key} updated`,
            '/admin',
          ),
        ),
      resetDemo: () =>
        commit((s) =>
          withLog({ roleId: s.roleId, userId: s.userId, workflow: s.workflow, ...seedData() }, 'config-changed', 'Demo data reset to the seeded dataset', '/admin/chemicals'),
        ),
    }
    return a
  }, [commit])

  const value = useMemo(() => ({ state, actions, hydrated }), [state, actions, hydrated])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useApp() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useApp must be used within StoreProvider')
  const { state, actions, hydrated } = ctx
  const user = state.users.find((u) => u.id === state.userId) ?? state.users[0]
  return { state, actions, hydrated, user, role: state.roleId }
}

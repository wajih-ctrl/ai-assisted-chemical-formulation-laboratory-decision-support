'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ColumnsIcon, DownloadIcon, FileTextIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { plural } from '@/lib/format'
import { buildDoseSeries, buildSweepSeries, distinctValues, hasResult, type ReferenceConditions } from '@/lib/analysis'
import { EmptyNote, GatedButton, Notice, PageHeader, Panel } from './primitives'
import { AppSelect, MultiSelect, type Option } from './pickers'
import { DoseResponseChart } from './dose-chart'
import { ExperimentDrawer } from './experiment-drawer'
import { ComparisonMatrix, CoverageGrid, ObservationPanel, SuggestedTest, deriveObservation } from './analysis-sections'

const DEFAULTS = { datasetId: 'all', crudeId: 'CR-101', formulationIds: ['DM-A101', 'DM-B205'], tempC: 60, settlingMin: 30, dosePpm: 100, matchedOnly: true }

export function AnalysisView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const [datasetId, setDatasetId] = useState(DEFAULTS.datasetId)
  const [crudeId, setCrudeId] = useState(DEFAULTS.crudeId)
  const [formulationIds, setFormulationIds] = useState<string[]>(DEFAULTS.formulationIds)
  const [tempC, setTempC] = useState(DEFAULTS.tempC)
  const [settlingMin, setSettlingMin] = useState(DEFAULTS.settlingMin)
  const [dosePpm, setDosePpm] = useState(DEFAULTS.dosePpm)
  const [matchedOnly, setMatchedOnly] = useState(DEFAULTS.matchedOnly)
  const [hidden, setHidden] = useState<string[]>([])
  const [coverageId, setCoverageId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const demFormulations = useMemo(() => state.formulations.filter((f) => f.categoryId === 'cat-demul'), [state.formulations])
  const demDatasets = state.datasets.filter((d) => d.workflow === 'demulsifier')
  const scoped = useMemo(() => state.experiments.filter((e) => datasetId === 'all' || e.datasetId === datasetId), [state.experiments, datasetId])
  const refCond: ReferenceConditions = { crudeId, tempC, settlingMin }

  const doses = useMemo(() => distinctValues(state.experiments, 'dosagePpm'), [state.experiments])
  const temps = useMemo(() => distinctValues(state.experiments, 'tempC'), [state.experiments])
  const settlings = useMemo(() => distinctValues(state.experiments, 'settlingMin'), [state.experiments])

  const allSeries = useMemo(() => buildDoseSeries(scoped, formulationIds, refCond, false), [scoped, formulationIds, crudeId, tempC, settlingMin]) // eslint-disable-line react-hooks/exhaustive-deps
  const doseSeries = useMemo(() => buildDoseSeries(scoped, formulationIds, refCond, matchedOnly), [scoped, formulationIds, crudeId, tempC, settlingMin, matchedOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  const visibleDose = doseSeries.filter((s) => !hidden.includes(s.formulationId))
  const totalRecorded = allSeries.reduce((n, s) => n + s.points.length, 0)
  const shown = doseSeries.reduce((n, s) => n + s.points.length, 0)
  const excluded = totalRecorded - shown

  const sweepFixed = { crudeId, dosagePpm: dosePpm, tempC, settlingMin }
  const settlingSeries = useMemo(() => buildSweepSeries(scoped, formulationIds, 'settlingMin', sweepFixed, matchedOnly), [scoped, formulationIds, crudeId, dosePpm, tempC, settlingMin, matchedOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  const tempSeries = useMemo(() => buildSweepSeries(scoped, formulationIds, 'tempC', sweepFixed, matchedOnly), [scoped, formulationIds, crudeId, dosePpm, tempC, settlingMin, matchedOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  const settlingVisible = settlingSeries.filter((s) => !hidden.includes(s.formulationId) && s.points.length > 0)
  const tempVisible = tempSeries.filter((s) => !hidden.includes(s.formulationId) && s.points.length > 0)

  const crude = state.crudes.find((c) => c.id === crudeId)
  const focusId = formulationIds.find((id) => !hidden.includes(id)) ?? formulationIds[0]
  const observation = deriveObservation(doseSeries.find((s) => s.formulationId === focusId))

  const matrixRows = useMemo(
    () =>
      scoped
        .filter((e) => formulationIds.includes(e.formulationId) && e.crudeId === crudeId && hasResult(e))
        .filter((e) => !matchedOnly || (e.tempC === tempC && e.settlingMin === settlingMin))
        .sort((a, b) => a.formulationId.localeCompare(b.formulationId) || (a.dosagePpm ?? 0) - (b.dosagePpm ?? 0) || a.id.localeCompare(b.id)),
    [scoped, formulationIds, crudeId, matchedOnly, tempC, settlingMin],
  )

  const coverageFormulation = coverageId && formulationIds.includes(coverageId) ? coverageId : formulationIds[0]
  const suggestion = state.recommendations.find(
    (r) => r.workflow === 'demulsifier' && r.formulationId === focusId && r.crudeId === crudeId && r.tempC === tempC && r.settlingMin === settlingMin && r.status !== 'Rejected',
  )

  const formulationOptions: Option[] = demFormulations.map((f) => ({ value: f.id, label: f.id, hint: f.name }))
  const numOptions = (list: number[], unit: string): Option[] => list.map((n) => ({ value: String(n), label: `${n} ${unit}` }))
  const scopeText = `${crudeId}${crude ? ` ${crude.name}` : ''} · ${tempC} °C · ${settlingMin} min · ${matchedOnly ? 'comparable conditions only' : 'all conditions shown'}`

  const dirty =
    datasetId !== DEFAULTS.datasetId ||
    crudeId !== DEFAULTS.crudeId ||
    tempC !== DEFAULTS.tempC ||
    settlingMin !== DEFAULTS.settlingMin ||
    dosePpm !== DEFAULTS.dosePpm ||
    matchedOnly !== DEFAULTS.matchedOnly ||
    formulationIds.join() !== DEFAULTS.formulationIds.join() ||
    hidden.length > 0

  const reset = () => {
    setDatasetId(DEFAULTS.datasetId)
    setCrudeId(DEFAULTS.crudeId)
    setFormulationIds(DEFAULTS.formulationIds)
    setTempC(DEFAULTS.tempC)
    setSettlingMin(DEFAULTS.settlingMin)
    setDosePpm(DEFAULTS.dosePpm)
    setMatchedOnly(DEFAULTS.matchedOnly)
    setHidden([])
  }

  const exportCsv = () => {
    const head = ['Experiment', 'Formulation', 'Crude', 'Dose ppm', 'Temp C', 'Settling min', 'Water separation %', 'Residual water %', 'Rag layer', 'Clarity', 'Status']
    const lines = matrixRows.map((e) =>
      [e.id, e.formulationId, e.crudeId, e.dosagePpm, e.tempC, e.settlingMin, e.waterSepPct, e.residualWaterPct ?? 'Not measured', e.ragLayer ?? 'Not measured', e.clarity ?? 'Not measured', e.status]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'bottle-test-analysis.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${plural(matrixRows.length, 'row')} to CSV`)
  }

  const addToReport = () => {
    actions.addReportItem({
      kind: 'analysis-view',
      title: `Bottle-test analysis: ${formulationIds.join(', ')} on ${crudeId}`,
      detail: `${scopeText}. ${plural(shown, 'recorded result')} shown${excluded > 0 && matchedOnly ? `; ${excluded} excluded for differing conditions` : ''}.`,
      refs: matrixRows.map((e) => e.id),
    })
    toast.success('Analysis view added to the report draft')
  }

  const addSuggestionToPlan = (rec: NonNullable<typeof suggestion>) => {
    const planId = actions.addRecommendationToPlan(rec.id, { assigneeId: null, plannedDate: '2026-10-27' })
    if (planId) toast.success(`${planId} added to the testing plan`, { action: { label: 'View', onClick: () => router.push('/testing-plan') } })
  }

  const legend = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show or hide formulations">
      {formulationIds.map((id) => {
        const f = state.formulations.find((x) => x.id === id)
        const off = hidden.includes(id)
        return (
          <button
            key={id}
            type="button"
            aria-pressed={!off}
            onClick={() => setHidden((h) => (off ? h.filter((x) => x !== id) : [...h, id]))}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[pressed=false]:bg-muted aria-[pressed=false]:text-muted-foreground aria-[pressed=true]:border-primary/40 aria-[pressed=true]:bg-accent"
          >
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: f?.color }} />
            {id}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Analysis"
        title="Bottle-Test Analysis"
        description="Review how water separation responds to dosage, settling time and temperature under comparable test conditions."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={matrixRows.length === 0}>
              <DownloadIcon data-icon="inline-start" />
              Export view
            </Button>
            <GatedButton allowed={can(role, 'report:generate')} capability="report:generate" onClick={addToReport}>
              <FileTextIcon data-icon="inline-start" />
              Add to report
            </GatedButton>
          </>
        }
      />

      <section aria-label="Analysis scope" className="panel mb-6 flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <AppSelect
            aria-label="Dataset"
            value={datasetId}
            onChange={setDatasetId}
            options={[{ value: 'all', label: 'All datasets' }, ...demDatasets.map((d) => ({ value: d.id, label: d.id }))]}
          />
          <AppSelect aria-label="Crude sample" value={crudeId} onChange={setCrudeId} options={state.crudes.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }))} />
          <MultiSelect label="Formulations" options={formulationOptions} selected={formulationIds} onChange={setFormulationIds} max={5} allLabel="None" />
          <AppSelect aria-label="Temperature" value={String(tempC)} onChange={(v) => setTempC(Number(v))} options={numOptions(temps, '°C')} />
          <AppSelect aria-label="Settling time" value={String(settlingMin)} onChange={(v) => setSettlingMin(Number(v))} options={numOptions(settlings, 'min')} />
          <AppSelect aria-label="Dosage for settling and temperature charts" value={String(dosePpm)} onChange={(v) => setDosePpm(Number(v))} options={numOptions(doses, 'ppm')} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <Switch checked={matchedOnly} onCheckedChange={setMatchedOnly} aria-label="Show only comparable conditions" />
            Show only comparable conditions
          </label>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {formulationIds.length === 0
              ? 'No formulation selected'
              : `${plural(shown, 'result')} shown of ${totalRecorded} recorded${excluded > 0 && matchedOnly ? ` · ${excluded} hidden because conditions differ` : ''}`}
          </p>
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset filters
          </Button>
        </div>
      </section>

      {formulationIds.length === 0 ? (
        <EmptyNote title="Select at least one formulation">Choose up to five formulations above to plot their recorded bottle-test results.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-6">
          <Panel
            title="Water separation vs chemical dosage"
            description={`Recorded results at ${tempC} °C and ${settlingMin} min on ${crudeId}. Lines join the means of matched replicates; hollow dashed markers differ from the selected conditions.`}
            action={legend}
          >
            {!matchedOnly && excluded > 0 ? (
              <Notice tone="amber" title="Mixed conditions shown" className="mb-3">
                Hollow markers were recorded under different crude, temperature or settling conditions and are not directly comparable. Hover a marker to see how it differs.
              </Notice>
            ) : null}
            {visibleDose.some((s) => s.points.length > 0) ? (
              <DoseResponseChart series={visibleDose} formulations={state.formulations} hideLegend height={340} onSelect={setOpenId} selectedId={openId} />
            ) : (
              <EmptyNote title="No comparable results">No recorded results match the selected conditions. Turn off the comparable filter or change the scope.</EmptyNote>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Observation" description="Derived from the matched points in the chart above.">
              <ObservationPanel obs={observation} refCond={refCond} crudeName={crude?.name ?? ''} onOpen={setOpenId} />
            </Panel>
            <Panel
              title="Recorded coverage"
              description={`${coverageFormulation} on ${crudeId} at ${settlingMin} min. Select a cell to open its experiment.`}
              action={
                <AppSelect
                  aria-label="Formulation for coverage grid"
                  className="w-32"
                  value={coverageFormulation}
                  onChange={setCoverageId}
                  options={formulationIds.map((id) => ({ value: id, label: id }))}
                />
              }
            >
              <CoverageGrid exps={scoped} formulationId={coverageFormulation} crudeId={crudeId} settlingMin={settlingMin} doses={doses} temps={temps} onOpen={setOpenId} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Water separation vs settling time" description={`${dosePpm} ppm, ${tempC} °C, ${crudeId}.`}>
              {settlingVisible.length > 0 ? (
                <DoseResponseChart series={settlingVisible} formulations={state.formulations} hideLegend height={260} xLabel="Settling time (min)" xName="Settling" xUnit="min" onSelect={setOpenId} selectedId={openId} />
              ) : (
                <EmptyNote title="No settling-time results">No recorded results at {dosePpm} ppm for the selected formulations under these conditions.</EmptyNote>
              )}
            </Panel>
            <Panel title="Water separation vs temperature" description={`${dosePpm} ppm, ${settlingMin} min, ${crudeId}. Observational only.`}>
              {tempVisible.length > 0 ? (
                <DoseResponseChart series={tempVisible} formulations={state.formulations} hideLegend height={260} xLabel="Bath temperature (°C)" xName="Temperature" xUnit="°C" onSelect={setOpenId} selectedId={openId} />
              ) : (
                <EmptyNote title="No temperature results">No recorded results at {dosePpm} ppm for the selected formulations under these conditions.</EmptyNote>
              )}
            </Panel>
          </div>

          <Panel
            title="Experiment comparison matrix"
            description="Recorded results behind the charts. Select two or more experiments to compare them side by side."
            bodyClassName="flex flex-col gap-3"
            action={
              <Button variant="outline" size="sm" disabled={state.compare.experimentIds.length < 2} onClick={() => router.push('/comparison')}>
                <ColumnsIcon data-icon="inline-start" />
                Compare selected ({state.compare.experimentIds.length})
              </Button>
            }
          >
            {matrixRows.length > 0 ? (
              <ComparisonMatrix rows={matrixRows} refCond={refCond} formulations={state.formulations} selected={state.compare.experimentIds} onToggle={actions.toggleCompareExperiment} onOpen={setOpenId} />
            ) : (
              <EmptyNote title="No rows to show">No completed experiments match this scope.</EmptyNote>
            )}
          </Panel>

          <Panel id="suggested-test" title="Suggested next test" description={`Based on the dosage observation for ${focusId} and the coverage grid.`}>
            <SuggestedTest rec={suggestion} role={role} onAdd={addSuggestionToPlan} expOpen={setOpenId} />
          </Panel>
        </div>
      )}

      <ExperimentDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}


'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DownloadIcon, PrinterIcon, RefreshCwIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { buildReport, defaultTitle, formulationsForWorkflow } from '@/lib/report'
import { downloadReportPdf } from '@/lib/report-pdf'
import type { ReportConfig, WorkflowId } from '@/lib/types'
import { EmptyNote, GatedButton, Notice, PageHeader, Panel } from './primitives'
import { AppSelect, MultiSelect, type Option } from './pickers'
import { ReportDocument } from './report-document'

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <Label htmlFor={id} className="text-sm text-ink">
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function ReportsView() {
  const { state, actions, role, user } = useApp()
  const [downloading, setDownloading] = useState(false)
  const draft = state.reportDraft
  const generated = state.reportGenerated
  const allowed = can(role, 'report:generate')
  const dirty = JSON.stringify(draft) !== JSON.stringify(generated)

  const isGas = draft.workflow === 'gasoline'
  const formulationOptions: Option[] = useMemo(
    () => formulationsForWorkflow(state, draft.workflow).map((f) => ({ value: f.id, label: f.id, hint: f.name })),
    [state, draft.workflow],
  )
  const scopeOptions: Option[] = useMemo(
    () =>
      isGas
        ? state.blends.map((b) => ({ value: b.id, label: b.id, hint: b.name }))
        : state.crudes.map((c) => ({ value: c.id, label: c.id, hint: c.name })),
    [state, isGas],
  )
  const datasetOptions: Option[] = useMemo(
    () => [
      { value: 'all', label: 'All datasets for this workflow' },
      ...state.datasets.filter((d) => d.workflow === draft.workflow).map((d) => ({ value: d.id, label: `${d.id}  ${d.name}` })),
    ],
    [state.datasets, draft.workflow],
  )

  const data = useMemo(() => (generated ? buildReport(state, generated, user.name) : null), [state, generated, user.name])

  const set = (patch: Partial<ReportConfig>) => {
    const next = { ...draft, ...patch }
    const prevAuto = defaultTitle(draft.workflow, draft.formulationIds, draft.crudeIds)
    if (!('title' in patch) && (draft.title === prevAuto || !draft.title.trim())) {
      next.title = defaultTitle(next.workflow, next.formulationIds, next.crudeIds)
    }
    actions.setReportDraft(next)
  }

  const changeWorkflow = (wf: string) => {
    const workflow = wf as WorkflowId
    actions.setReportDraft({
      workflow,
      datasetId: 'all',
      formulationIds: [],
      crudeIds: [],
      title: defaultTitle(workflow, [], []),
    })
  }

  const onGenerate = () => {
    actions.generateReport()
    toast.success(dirty ? 'Report updated' : 'Report preview generated')
  }

  const onDownload = async () => {
    if (!data) return
    setDownloading(true)
    try {
      const name = await downloadReportPdf(data)
      toast.success(`Downloaded ${name}`)
    } catch {
      toast.error('The PDF could not be created. Try again or use Print.')
    } finally {
      setDownloading(false)
    }
  }

  const noExperiments = !data || data.empty

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Reporting"
        title="Report Builder"
        description="Assemble a laboratory report from the datasets, formulations and conditions you select. Every figure is taken from recorded experiments; nothing is estimated."
        actions={
          <>
            <GatedButton allowed={allowed} capability="report:generate" variant="outline" onClick={() => actions.resetReport()}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </GatedButton>
            <GatedButton allowed={allowed} capability="report:generate" onClick={onGenerate}>
              <RefreshCwIcon data-icon="inline-start" />
              {dirty ? 'Update Report' : 'Generate Preview'}
            </GatedButton>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="print-hidden flex flex-col gap-4 xl:sticky xl:top-4">
          <Panel title="Report scope" description="Choose what the report covers.">
            <div className="flex flex-col gap-4">
              <Field label="Workflow" htmlFor="rp-workflow">
                <AppSelect
                  id="rp-workflow"
                  value={draft.workflow}
                  onChange={changeWorkflow}
                  options={[
                    { value: 'demulsifier', label: 'Oilfield Demulsifiers' },
                    { value: 'gasoline', label: 'Gasoline Blending Additives' },
                  ]}
                />
              </Field>
              <Field label="Dataset" htmlFor="rp-dataset">
                <AppSelect id="rp-dataset" value={draft.datasetId} onChange={(v) => set({ datasetId: v })} options={datasetOptions} />
              </Field>
              <Field label={isGas ? 'Additives' : 'Formulations'}>
                <MultiSelect
                  label={isGas ? 'Additives' : 'Formulations'}
                  options={formulationOptions}
                  selected={draft.formulationIds}
                  onChange={(ids) => set({ formulationIds: ids })}
                  allLabel="All"
                />
              </Field>
              <Field label={isGas ? 'Blend families' : 'Crude samples'}>
                <MultiSelect
                  label={isGas ? 'Blends' : 'Crudes'}
                  options={scopeOptions}
                  selected={draft.crudeIds}
                  onChange={(ids) => set({ crudeIds: ids })}
                  allLabel="All"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From" htmlFor="rp-from">
                  <Input id="rp-from" type="date" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(e) => set({ dateFrom: e.target.value })} />
                </Field>
                <Field label="To" htmlFor="rp-to">
                  <Input id="rp-to" type="date" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(e) => set({ dateTo: e.target.value })} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Content" description="Choose which sections carry analysis.">
            <div className="flex flex-col gap-4">
              <Field label="Report title" htmlFor="rp-title">
                <Input id="rp-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <ToggleRow id="rp-charts" label="Performance charts" hint="Recorded points with replicate means." checked={draft.includeCharts} onChange={(v) => set({ includeCharts: v })} />
              <ToggleRow id="rp-insights" label="AI-assisted insights" hint="Observations with their evidence and limits." checked={draft.includeInsights} onChange={(v) => set({ includeInsights: v })} />
              <ToggleRow id="rp-recs" label="Proposed experiments" hint="Open recommendations and plan status." checked={draft.includeRecommendations} onChange={(v) => set({ includeRecommendations: v })} />
              <Field label="Chemist's notes" htmlFor="rp-notes">
                <Textarea id="rp-notes" rows={4} placeholder="Add context, caveats or decisions to include in the report." value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Items added to report"
            description="Insights, comparisons and experiments you flagged elsewhere."
          >
            {state.reportItems.length ? (
              <ul className="flex flex-col gap-2">
                {state.reportItems.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-2 rounded-md border px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{it.title}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{it.detail}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${it.title} from report`} onClick={() => actions.removeReportItem(it.id)}>
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing added yet. Use &ldquo;Add to report&rdquo; on insights, comparisons or experiments.</p>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h2 className="font-heading text-sm font-semibold text-ink">Report preview</h2>
              <p className="text-xs text-muted-foreground">Exactly what the PDF and print output will contain.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GatedButton allowed={allowed && !noExperiments} capability="report:generate" variant="outline" onClick={() => window.print()}>
                <PrinterIcon data-icon="inline-start" />
                Print
              </GatedButton>
              <GatedButton allowed={allowed && !noExperiments && !downloading} capability="report:generate" onClick={onDownload}>
                <DownloadIcon data-icon="inline-start" />
                {downloading ? 'Creating PDF' : 'Download PDF'}
              </GatedButton>
            </div>
          </div>

          {dirty ? (
            <Notice tone="amber" title="The preview is out of date" className="print-hidden">
              You changed the report settings. Select &ldquo;Update Report&rdquo; to refresh the preview before downloading or printing.
            </Notice>
          ) : null}

          {data ? (
            <>
              {data.empty ? (
                <EmptyNote title="No experiments match these filters">
                  Widen the date range or select more formulations and crude samples, then update the report.
                </EmptyNote>
              ) : null}
              <ReportDocument data={data} formulations={state.formulations} />
            </>
          ) : (
            <EmptyNote title="No preview yet" action={<GatedButton allowed={allowed} capability="report:generate" onClick={onGenerate}>Generate Preview</GatedButton>}>
              Choose the report scope, then generate a preview.
            </EmptyNote>
          )}
        </div>
      </div>
    </div>
  )
}

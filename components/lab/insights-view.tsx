'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowUpRightIcon, CheckIcon, ChevronDownIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { fmtDate, plural } from '@/lib/format'
import type { DosePoint, DoseSeries } from '@/lib/analysis'
import type { AnalyticalInsight, Experiment, GasolineExperiment, InsightCategory, WorkflowId } from '@/lib/types'
import { EmptyNote, ExpLink, FormulationChip, GatedButton, KeyValue, Notice, PageHeader, Pill, StatusPill, Val, type Tone } from './primitives'
import { DoseResponseChart } from './dose-chart'

const CATEGORY_META: Record<InsightCategory, { label: string; tone: Tone }> = {
  dosage: { label: 'Dosage response', tone: 'teal' },
  formulation: { label: 'Formulation performance', tone: 'blue' },
  temperature: { label: 'Temperature influence', tone: 'rust' },
  settling: { label: 'Settling time', tone: 'amber' },
  similar: { label: 'Similar experiments', tone: 'slate' },
  coverage: { label: 'Coverage gaps', tone: 'green' },
}

const CATEGORY_ORDER = Object.keys(CATEGORY_META) as InsightCategory[]

function doseSeriesFor(exps: Experiment[]): DoseSeries[] {
  const ids = Array.from(new Set(exps.map((e) => e.formulationId)))
  return ids.map((fid) => {
    const points = exps
      .filter((e) => e.formulationId === fid && e.dosagePpm !== null && e.waterSepPct !== null)
      .map<DosePoint>((e) => ({ x: e.dosagePpm as number, y: e.waterSepPct as number, id: e.id, formulationId: fid, exp: e, mismatch: [] }))
    const byX = new Map<number, number[]>()
    points.forEach((p) => byX.set(p.x, [...(byX.get(p.x) ?? []), p.y]))
    const means = Array.from(byX.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, ys]) => ({ x, y: ys.reduce((s, v) => s + v, 0) / ys.length, n: ys.length }))
    return { formulationId: fid, points, means }
  })
}

export function InsightsView() {
  const { state, actions, role } = useApp()
  const [workflow, setWorkflow] = useState<WorkflowId>(state.workflow)
  const [category, setCategory] = useState<'all' | InsightCategory>('all')
  const [evidenceId, setEvidenceId] = useState<string | null>(null)

  const inWorkflow = useMemo(() => state.insights.filter((i) => i.workflow === workflow), [state.insights, workflow])
  const counts = useMemo(() => {
    const m = new Map<InsightCategory, number>()
    inWorkflow.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1))
    return m
  }, [inWorkflow])
  const visible = category === 'all' ? inWorkflow : inWorkflow.filter((i) => i.category === category)
  const evidence = evidenceId ? state.insights.find((i) => i.id === evidenceId) : undefined
  const inReport = (id: string) => state.reportItems.some((r) => r.kind === 'insight' && r.refs[0] === id)

  const addToReport = (i: AnalyticalInsight) => {
    actions.addReportItem({
      kind: 'insight',
      title: i.title,
      detail: i.observation,
      refs: [i.id, ...i.experimentIds],
    })
    toast.success(`${i.id} added to the report builder`)
  }

  const switchWorkflow = (w: WorkflowId) => {
    setWorkflow(w)
    setCategory('all')
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Analysis"
        title="AI-Assisted Laboratory Insights"
        description="Plain-language observations drawn from recorded experiments. Every insight cites its evidence, states its limits and leaves interpretation to the chemist."
        actions={
          <Tabs value={workflow} onValueChange={(v) => switchWorkflow(v as WorkflowId)}>
            <TabsList aria-label="Workflow">
              <TabsTrigger value="demulsifier">Oilfield demulsifiers</TabsTrigger>
              <TabsTrigger value="gasoline">Gasoline blending</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Notice tone="amber" title="Simulated insights" className="mb-5">
        These insights are illustrative and generated from the demo dataset. They describe what the recorded results show, never predict performance, and require chemist review before any action is taken.
      </Notice>

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Insight category">
        <CategoryButton active={category === 'all'} onClick={() => setCategory('all')} label="All insights" count={inWorkflow.length} />
        {CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => (
          <CategoryButton key={c} active={category === c} onClick={() => setCategory(c)} label={CATEGORY_META[c].label} count={counts.get(c) ?? 0} />
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyNote title="No insights in this view">There are no recorded observations for this workflow and category yet.</EmptyNote>
      ) : (
        <ul className="grid gap-5 xl:grid-cols-2">
          {visible.map((i) => (
            <li key={i.id} className="min-w-0">
              <InsightCard
                insight={i}
                added={inReport(i.id)}
                canReport={can(role, 'report:generate')}
                onEvidence={() => setEvidenceId(i.id)}
                onAdd={() => addToReport(i)}
              />
            </li>
          ))}
        </ul>
      )}

      <EvidenceSheet insight={evidence} onClose={() => setEvidenceId(null)} />
    </div>
  )
}

function CategoryButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card text-ink hover:bg-muted',
      )}
    >
      {label}
      <span className={cn('tnum text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{count}</span>
    </button>
  )
}

function InsightCard({
  insight: i,
  added,
  canReport,
  onEvidence,
  onAdd,
}: {
  insight: AnalyticalInsight
  added: boolean
  canReport: boolean
  onEvidence: () => void
  onAdd: () => void
}) {
  const { state } = useApp()
  const [open, setOpen] = useState(false)
  const meta = CATEGORY_META[i.category]
  const panelId = `${i.id}-supporting`
  const rec = i.recommendationId ? state.recommendations.find((r) => r.id === i.recommendationId) : undefined

  return (
    <article className="panel flex h-full flex-col" aria-labelledby={`${i.id}-title`}>
      <header className="flex flex-col gap-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={meta.tone}>{meta.label}</Pill>
          <Pill tone="amber">Simulated insight</Pill>
          <span className="tnum ml-auto text-xs text-muted-foreground">{i.id}</span>
        </div>
        <h2 id={`${i.id}-title`} className="font-heading text-base font-semibold leading-snug text-ink text-balance">
          {i.title}
        </h2>
        <p className="text-sm leading-relaxed text-ink">{i.observation}</p>
      </header>

      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
        <KeyValue label="Formulations">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {i.formulationIds.map((id) => (
              <FormulationChip key={id} id={id} color={state.formulations.find((f) => f.id === id)?.color} />
            ))}
          </span>
        </KeyValue>
        <KeyValue label="Matching conditions">{i.conditions}</KeyValue>
        <KeyValue label="Supporting experiments" className="sm:col-span-2">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {i.experimentIds.map((id) => (
              <ExpLink key={id} id={id} />
            ))}
          </span>
        </KeyValue>
        <KeyValue label="What the records show" className="sm:col-span-2">
          <span className="leading-relaxed">{i.explanation}</span>
        </KeyValue>
        <KeyValue label="Limitations" className="sm:col-span-2">
          <span className="leading-relaxed text-muted-foreground">{i.limitations}</span>
        </KeyValue>
        <KeyValue label="Proposed next action" className="sm:col-span-2">
          <span className="leading-relaxed">{i.nextAction}</span>
        </KeyValue>
        {i.unknowns.length ? (
          <KeyValue label="Still unknown" className="sm:col-span-2">
            <ul className="flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground">
              {i.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </KeyValue>
        ) : null}
      </dl>

      {open ? (
        <div id={panelId} className="border-t bg-muted/30 px-4 py-3">
          <SupportingTable insight={i} />
        </div>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button variant="outline" size="sm" onClick={onEvidence}>
          <SearchIcon data-icon="inline-start" />
          View evidence
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}>
          <ChevronDownIcon data-icon="inline-start" className={cn('transition-transform', open && 'rotate-180')} />
          {open ? 'Hide' : 'Open'} supporting experiments
        </Button>
        {rec ? (
          <Button variant="ghost" size="sm" render={<Link href={`/recommendations#${rec.id}`} />}>
            Review {rec.id}
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        ) : null}
        <span className="ml-auto">
          {added ? (
            <Button variant="secondary" size="sm" disabled>
              <CheckIcon data-icon="inline-start" />
              In report
            </Button>
          ) : (
            <GatedButton allowed={canReport} capability="report:generate" variant="secondary" size="sm" onClick={onAdd}>
              <FileTextIcon data-icon="inline-start" />
              Add to report
            </GatedButton>
          )}
        </span>
      </footer>
    </article>
  )
}

function SupportingTable({ insight }: { insight: AnalyticalInsight }) {
  const { state } = useApp()
  if (insight.workflow === 'gasoline') {
    const rows = insight.experimentIds.map((id) => state.gasoline.find((g) => g.id === id)).filter((g): g is GasolineExperiment => !!g)
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Experiment</TableHead>
            <TableHead>Blend</TableHead>
            <TableHead>Additive</TableHead>
            <TableHead className="text-right">Booster (ppm)</TableHead>
            <TableHead className="text-right">RON</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((g) => (
            <TableRow key={g.id}>
              <TableCell>
                <ExpLinkGas id={g.id} />
              </TableCell>
              <TableCell>{g.blendId}</TableCell>
              <TableCell>{g.additiveType}</TableCell>
              <TableCell className="text-right">
                <Val v={g.boosterPpm} />
              </TableCell>
              <TableCell className="text-right">
                <Val v={g.ron} digits={1} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  const rows = insight.experimentIds.map((id) => state.experiments.find((e) => e.id === id)).filter((e): e is Experiment => !!e)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Experiment</TableHead>
          <TableHead>Formulation</TableHead>
          <TableHead>Crude</TableHead>
          <TableHead className="text-right">Dosage (ppm)</TableHead>
          <TableHead className="text-right">Temp (°C)</TableHead>
          <TableHead className="text-right">Settling (min)</TableHead>
          <TableHead className="text-right">Water sep. (%)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <ExpLink id={e.id} />
            </TableCell>
            <TableCell>{e.formulationId}</TableCell>
            <TableCell className="tnum">{e.crudeId}</TableCell>
            <TableCell className="text-right">
              <Val v={e.dosagePpm} />
            </TableCell>
            <TableCell className="text-right">
              <Val v={e.tempC} />
            </TableCell>
            <TableCell className="text-right">
              <Val v={e.settlingMin} />
            </TableCell>
            <TableCell className="text-right">
              <Val v={e.waterSepPct} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ExpLinkGas({ id }: { id: string }) {
  return <span className="tnum font-medium text-ink">{id}</span>
}

function EvidenceSheet({ insight, onClose }: { insight: AnalyticalInsight | undefined; onClose: () => void }) {
  const { state } = useApp()
  const exps = useMemo(
    () => (insight && insight.workflow === 'demulsifier' ? insight.experimentIds.map((id) => state.experiments.find((e) => e.id === id)).filter((e): e is Experiment => !!e) : []),
    [insight, state.experiments],
  )
  const series = useMemo(() => doseSeriesFor(exps), [exps])
  const multiDose = new Set(exps.map((e) => e.dosagePpm)).size > 1

  return (
    <Sheet open={!!insight} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        {insight ? (
          <>
            <SheetHeader className="gap-1 border-b pr-12">
              <p className="eyebrow">Evidence · {insight.id}</p>
              <SheetTitle className="font-heading text-lg leading-snug text-ink text-balance">{insight.title}</SheetTitle>
              <SheetDescription>{insight.conditions}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <p className="text-sm leading-relaxed text-ink">{insight.observation}</p>

              {insight.workflow === 'demulsifier' && multiDose ? (
                <div className="flex flex-col gap-2">
                  <p className="eyebrow">Recorded results behind this insight</p>
                  <DoseResponseChart series={series} formulations={state.formulations} height={240} />
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="eyebrow">{plural(insight.experimentIds.length, 'supporting experiment')}</p>
                <div className="rounded-lg border">
                  <SupportingTable insight={insight} />
                </div>
              </div>

              {exps.length ? (
                <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  {exps.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-x-2">
                      <ExpLink id={e.id} />
                      <StatusPill status={e.status} />
                      <span>
                        {fmtDate(e.testDate)} · {e.ragLayer ?? 'Rag layer not recorded'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Notice tone="slate" title="Limitations">
                {insight.limitations}
              </Notice>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

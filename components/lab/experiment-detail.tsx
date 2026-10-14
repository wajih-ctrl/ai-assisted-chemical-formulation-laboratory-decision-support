'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ArrowLeftIcon, ArrowRightIcon, ClipboardListIcon, Columns2Icon, CopyIcon, FileTextIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { fmtDate, mean, plural } from '@/lib/format'
import { crudeLabel, hasResult } from '@/lib/analysis'
import type { Experiment, GasolineExperiment } from '@/lib/types'
import { Dl, EmptyNote, ExpLink, FormulationChip, GatedButton, KeyValue, PageHeader, Panel, Pill, StatusPill, Val } from './primitives'

const NOT_RECORDED = <span className="text-xs italic text-subtle">Not recorded</span>

export function ExperimentDetail({ id }: { id: string }) {
  const { state } = useApp()
  const dem = state.experiments.find((e) => e.id === id)
  const gas = state.gasoline.find((e) => e.id === id)

  if (dem) return <DemulsifierDetail exp={dem} />
  if (gas) return <GasolineDetail exp={gas} />
  return (
    <>
      <PageHeader eyebrow="Experiment record" title={`No record named ${id}`} />
      <EmptyNote title="Experiment not found" action={<Button render={<Link href="/experiments" />}>Back to experiments</Button>}>
        It may have been removed, or the identifier in the address is incorrect.
      </EmptyNote>
    </>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" render={<Link href="/experiments" />}>
      <ArrowLeftIcon data-icon="inline-start" />
      Back to experiments
    </Button>
  )
}

function Meta({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map((i) => (
        <KeyValue key={i.label} label={i.label}>
          {i.value}
        </KeyValue>
      ))}
    </dl>
  )
}

function DemulsifierDetail({ exp }: { exp: Experiment }) {
  const router = useRouter()
  const { state, actions } = useApp()
  const formulation = state.formulations.find((f) => f.id === exp.formulationId)
  const category = state.categories.find((c) => c.id === formulation?.categoryId)
  const crude = state.crudes.find((c) => c.id === exp.crudeId)
  const tech = state.users.find((u) => u.id === exp.technicianId)
  const canEdit = can(state.roleId, 'experiment:edit')
  const canAdd = can(state.roleId, 'experiment:add')
  const canPlan = can(state.roleId, 'plan:create')
  const inCompare = state.compare.experimentIds.includes(exp.id)
  const linkedPlan = state.plan.find((p) => p.id === exp.planId) ?? state.plan.find((p) => p.supportingExperimentIds.includes(exp.id))

  const related = useMemo(() => {
    return state.experiments
      .filter((e) => e.id !== exp.id && e.formulationId === exp.formulationId)
      .map((e) => {
        const matches: string[] = []
        if (e.crudeId === exp.crudeId) matches.push('Same crude')
        if (e.dosagePpm !== null && e.dosagePpm === exp.dosagePpm) matches.push('Same dose')
        if (e.tempC !== null && e.tempC === exp.tempC) matches.push('Same temperature')
        if (e.settlingMin !== null && e.settlingMin === exp.settlingMin) matches.push('Same settling time')
        return { e, matches }
      })
      .filter((r) => r.matches.length >= 2)
      .sort((a, b) => b.matches.length - a.matches.length || b.e.testDate.localeCompare(a.e.testDate))
  }, [state.experiments, exp])

  const comparable = related.filter((r) => r.e.crudeId === exp.crudeId && r.e.tempC === exp.tempC && r.e.settlingMin === exp.settlingMin && r.e.waterSepPct !== null)
  const comparableMean = mean(comparable.map((r) => r.e.waterSepPct as number))
  const recommendation = state.recommendations.find((r) => r.formulationId === exp.formulationId && r.crudeId === exp.crudeId && r.status !== 'Rejected')

  const analysis: string[] = []
  if (!hasResult(exp)) {
    analysis.push('No water separation has been recorded for this test, so there is nothing to interpret yet. Enter results to unlock the comparison with related runs.')
  } else {
    if (comparableMean !== null && exp.waterSepPct !== null) {
      const diff = exp.waterSepPct - comparableMean
      analysis.push(
        `Water separation of ${exp.waterSepPct}% is ${Math.abs(diff) < 0.5 ? 'in line with' : diff > 0 ? `${diff.toFixed(1)} points above` : `${Math.abs(diff).toFixed(1)} points below`} the mean of ${comparableMean.toFixed(1)}% across ${plural(comparable.length, 'other test')} of ${exp.formulationId} on ${exp.crudeId} at ${exp.tempC} °C and ${exp.settlingMin} min.`,
      )
    } else {
      analysis.push(`No other ${exp.formulationId} tests share this crude, temperature and settling time, so this result has no like-for-like baseline yet.`)
    }
    const sameCrude = related.filter((r) => r.e.crudeId === exp.crudeId && r.e.waterSepPct !== null && r.e.dosagePpm !== null)
    const best = sameCrude.sort((a, b) => (b.e.waterSepPct as number) - (a.e.waterSepPct as number))[0]
    if (best && exp.waterSepPct !== null && (best.e.waterSepPct as number) > exp.waterSepPct) {
      analysis.push(`${best.e.id} reached ${best.e.waterSepPct}% at ${best.e.dosagePpm} ppm on the same crude, so a different dose may be worth testing against this record.`)
    }
    if (exp.residualWaterPct !== null && exp.residualWaterPct > 1) {
      analysis.push(`Residual water of ${exp.residualWaterPct}% is above a 1% BS&W reference level commonly used for dehydrated crude.`)
    }
  }

  function duplicate() {
    const nid = actions.duplicateExperiment(exp.id)
    if (nid) {
      toast.success(`${nid} created as a draft duplicate of ${exp.id}`, { description: 'Results were cleared. Conditions were kept.' })
      router.push(`/experiments/${nid}`)
    }
  }

  function addToPlan() {
    const pid = actions.addPlanFromExperiment(exp.id)
    if (pid) toast.success(`${pid} added to the testing plan`, { action: { label: 'Open plan', onClick: () => router.push('/testing-plan') } })
  }

  return (
    <>
      <PageHeader
        eyebrow="Experiment record"
        title={exp.id}
        meta={
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={exp.status} />
              {exp.source !== 'manual' && exp.source !== 'seed' ? <Pill tone="slate">{exp.source === 'import' ? 'Imported' : exp.source === 'duplicate' ? `Duplicate of ${exp.duplicatedFrom ?? 'another record'}` : 'From testing plan'}</Pill> : null}
            </div>
            <Meta
              items={[
                { label: 'Formulation', value: <FormulationChip id={exp.formulationId} color={formulation?.color} label={formulation ? `${exp.formulationId}: ${formulation.name}` : exp.formulationId} /> },
                { label: 'Crude sample', value: `${crudeLabel(state.crudes, exp.crudeId)} · ${exp.sampleId}` },
                { label: 'Test date', value: <span className="tnum">{fmtDate(exp.testDate)}</span> },
                { label: 'Technician', value: tech?.name ?? NOT_RECORDED },
              ]}
            />
          </div>
        }
        actions={
          <>
            <BackLink />
            <GatedButton allowed={canEdit} capability="experiment:edit" variant="outline" render={<Link href={`/experiments/new?edit=${exp.id}`} />}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </GatedButton>
            <GatedButton allowed={canAdd} capability="experiment:add" variant="outline" onClick={duplicate}>
              <CopyIcon data-icon="inline-start" />
              Duplicate
            </GatedButton>
            <Button
              variant="outline"
              onClick={() => {
                if (!inCompare) actions.toggleCompareExperiment(exp.id)
                toast.success(`${exp.id} carried into the comparison workspace`)
                router.push('/comparison')
              }}
            >
              <Columns2Icon data-icon="inline-start" />
              {inCompare ? 'Open comparison' : 'Compare'}
            </Button>
            <GatedButton allowed={canPlan} capability="plan:create" onClick={addToPlan}>
              <ClipboardListIcon data-icon="inline-start" />
              Add to testing plan
            </GatedButton>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Panel title="Experiment overview" description="Identity, workflow and record status.">
            <Dl className="sm:grid-cols-2 lg:grid-cols-3">
              <KeyValue label="Experiment ID">
                <span className="tnum font-medium">{exp.id}</span>
              </KeyValue>
              <KeyValue label="Workflow">Demulsifier bottle test</KeyValue>
              <KeyValue label="Status">
                <StatusPill status={exp.status} />
              </KeyValue>
              <KeyValue label="Dataset">
                <span className="tnum">{exp.datasetId}</span>
              </KeyValue>
              <KeyValue label="Record origin">{exp.source === 'seed' ? 'Historical record' : exp.source[0].toUpperCase() + exp.source.slice(1)}</KeyValue>
              <KeyValue label="Linked plan item">
                {linkedPlan ? (
                  <Link href="/testing-plan" className="tnum font-medium text-teal-ink underline-offset-2 hover:underline">
                    {linkedPlan.id}
                  </Link>
                ) : (
                  <span className="text-xs italic text-subtle">None</span>
                )}
              </KeyValue>
            </Dl>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Chemical formulation">
              <Dl>
                <KeyValue label="Formulation ID">
                  <FormulationChip id={exp.formulationId} color={formulation?.color} />
                </KeyValue>
                <KeyValue label="Name">{formulation?.name ?? NOT_RECORDED}</KeyValue>
                <KeyValue label="Chemical category">{category?.name ?? NOT_RECORDED}</KeyValue>
                <KeyValue label="Description">{formulation?.description ?? NOT_RECORDED}</KeyValue>
              </Dl>
            </Panel>
            <Panel title="Crude sample information">
              <Dl>
                <KeyValue label="Crude source">{crude ? `${crude.id}: ${crude.name}` : exp.crudeId}</KeyValue>
                <KeyValue label="Sample ID">
                  <span className="tnum">{exp.sampleId || '—'}</span>
                </KeyValue>
                <KeyValue label="Water cut">
                  <Val v={exp.waterCutPct} unit="%" />
                </KeyValue>
                <KeyValue label="Sample notes">{crude?.notes ?? NOT_RECORDED}</KeyValue>
              </Dl>
            </Panel>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Test conditions">
              <Dl className="grid-cols-2">
                <KeyValue label="Chemical dosage">
                  <Val v={exp.dosagePpm} unit="ppm" className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Temperature">
                  <Val v={exp.tempC} unit="°C" className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Settling time">
                  <Val v={exp.settlingMin} unit="min" className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Mixing conditions" className="col-span-2">
                  {exp.mixing || NOT_RECORDED}
                </KeyValue>
              </Dl>
            </Panel>
            <Panel title="Recorded performance" description="Blank values were not measured, they are not zero.">
              <Dl className="grid-cols-2">
                <KeyValue label="Water separation">
                  <Val v={exp.waterSepPct} unit="%" className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Residual water (BS&W)">
                  <Val v={exp.residualWaterPct} unit="%" digits={1} className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Rag layer">{exp.ragLayer ?? NOT_RECORDED}</KeyValue>
                <KeyValue label="Interface clarity">{exp.clarity ?? NOT_RECORDED}</KeyValue>
              </Dl>
            </Panel>
          </div>

          <Panel title="Laboratory observations">
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-ink">{exp.observations || NOT_RECORDED}</p>
              {exp.notes ? (
                <div className="flex flex-col gap-1 border-t pt-3">
                  <p className="eyebrow">Technician notes</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{exp.notes}</p>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Related experiments" description={`Other ${exp.formulationId} tests that share at least two conditions with this one.`} bodyClassName="p-0">
            {related.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">No other tests match this record on two or more conditions yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Crude</TableHead>
                    <TableHead className="text-right">Dose</TableHead>
                    <TableHead className="text-right">Temp</TableHead>
                    <TableHead className="text-right">Settling</TableHead>
                    <TableHead className="text-right">Water sep.</TableHead>
                    <TableHead>Matches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {related.slice(0, 6).map(({ e, matches }) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <ExpLink id={e.id} />
                      </TableCell>
                      <TableCell className="tnum">{e.crudeId}</TableCell>
                      <TableCell className="text-right">
                        <Val v={e.dosagePpm} unit="ppm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Val v={e.tempC} unit="°C" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Val v={e.settlingMin} unit="min" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Val v={e.waterSepPct} unit="%" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {matches.map((m) => (
                            <Pill key={m} tone="slate">
                              {m}
                            </Pill>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Simulated analysis" action={<Pill tone="blue">Simulated</Pill>} description="Descriptive observations drawn from this dataset, not a prediction.">
            <ul className="flex flex-col gap-3">
              {analysis.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink">
                  {a}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Next actions">
            <div className="flex flex-col gap-3">
              {recommendation ? (
                <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3">
                  <p className="eyebrow">Recommended follow-up</p>
                  <p className="text-sm font-medium text-ink">{recommendation.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{recommendation.coverageGap}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No open recommendation targets this formulation and crude pair.</p>
              )}
              <ActionLink href="/recommendations" label="Review recommendations" />
              <ActionLink href="/analysis/demulsifier" label="Open bottle-test analysis" />
              <ActionLink href="/comparison" label="Go to formulation comparison" />
              <Button
                variant="outline"
                onClick={() => {
                  actions.addReportItem({ kind: 'experiment', title: `${exp.id}: ${exp.formulationId} on ${exp.crudeId}`, detail: `${exp.dosagePpm ?? '?'} ppm, ${exp.tempC ?? '?'} °C, ${exp.settlingMin ?? '?'} min`, refs: [exp.id] })
                  toast.success(`${exp.id} added to the report draft`)
                }}
                className="justify-start"
              >
                <FileTextIcon data-icon="inline-start" />
                Add to report draft
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" render={<Link href={href} />} className="justify-between">
      {label}
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
}

function GasolineDetail({ exp }: { exp: GasolineExperiment }) {
  const router = useRouter()
  const { state, actions } = useApp()
  const blend = state.blends.find((b) => b.id === exp.blendId)
  const additive = state.formulations.find((f) => f.id === exp.additiveType)
  const tech = state.users.find((u) => u.id === exp.technicianId)
  const canEdit = can(state.roleId, 'experiment:edit')
  const canAdd = can(state.roleId, 'experiment:add')
  const canPlan = can(state.roleId, 'plan:create')
  const total = exp.components.reduce((s, c) => s + c.pct, 0)

  const related = state.gasoline
    .filter((e) => e.id !== exp.id && e.blendId === exp.blendId)
    .sort((a, b) => Math.abs((a.boosterPpm ?? 0) - (exp.boosterPpm ?? 0)) - Math.abs((b.boosterPpm ?? 0) - (exp.boosterPpm ?? 0)))
    .slice(0, 6)
  const baseline = state.gasoline.find((e) => e.blendId === exp.blendId && e.boosterPpm === 0 && e.ron !== null)

  const analysis: string[] = []
  if (exp.ron === null) analysis.push('No RON has been measured for this blend yet, so there is nothing to interpret.')
  else if (baseline && baseline.id !== exp.id) {
    const gain = exp.ron - (baseline.ron as number)
    analysis.push(`Measured RON of ${exp.ron.toFixed(1)} is ${gain >= 0 ? `${gain.toFixed(1)} above` : `${Math.abs(gain).toFixed(1)} below`} the un-dosed baseline ${baseline.id} (${(baseline.ron as number).toFixed(1)}) for ${exp.blendId}.`)
  } else analysis.push(`No un-dosed baseline is recorded for ${exp.blendId}, so the booster response cannot be isolated.`)

  function duplicate() {
    const nid = actions.duplicateExperiment(exp.id)
    if (nid) {
      toast.success(`${nid} created as a draft duplicate of ${exp.id}`)
      router.push(`/experiments/${nid}`)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Experiment record"
        title={exp.id}
        meta={
          <div className="flex flex-col gap-3">
            <StatusPill status={exp.status} />
            <Meta
              items={[
                { label: 'Blend', value: blend ? `${exp.blendId}: ${blend.name}` : exp.blendId },
                { label: 'Booster', value: additive ? `${additive.id}: ${additive.name}` : exp.additiveType },
                { label: 'Test date', value: <span className="tnum">{fmtDate(exp.testDate)}</span> },
                { label: 'Technician', value: tech?.name ?? NOT_RECORDED },
              ]}
            />
          </div>
        }
        actions={
          <>
            <BackLink />
            <GatedButton allowed={canEdit} capability="experiment:edit" variant="outline" render={<Link href={`/experiments/new?edit=${exp.id}`} />}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </GatedButton>
            <GatedButton allowed={canAdd} capability="experiment:add" variant="outline" onClick={duplicate}>
              <CopyIcon data-icon="inline-start" />
              Duplicate
            </GatedButton>
            <Button variant="outline" render={<Link href="/analysis/gasoline" />}>
              <Columns2Icon data-icon="inline-start" />
              Open blend analysis
            </Button>
            <GatedButton
              allowed={canPlan}
              capability="plan:create"
              onClick={() => {
                const pid = actions.addPlanItem({
                  workflow: 'gasoline',
                  title: `Follow-up to ${exp.id}: ${exp.blendId} with ${exp.additiveType}`,
                  formulationId: exp.additiveType,
                  crudeId: '',
                  dosagePpm: exp.boosterPpm ?? 300,
                  tempC: null,
                  settlingMin: null,
                  assigneeId: null,
                  plannedDate: '2026-10-27',
                  status: 'Proposed',
                  supportingExperimentIds: [exp.id],
                  notes: `Created from ${exp.id}.`,
                })
                toast.success(`${pid} added to the testing plan`, { action: { label: 'Open plan', onClick: () => router.push('/testing-plan') } })
              }}
            >
              <ClipboardListIcon data-icon="inline-start" />
              Add to testing plan
            </GatedButton>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Panel title="Base blend composition" description={`Proportions total ${total.toFixed(1)} vol%.`}>
            <ul className="flex flex-col gap-3">
              {exp.components.map((c) => (
                <li key={c.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{c.name}</span>
                    <span className="tnum font-medium text-ink">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(c.pct, 100)}%`, backgroundColor: blend?.color ?? '#087f83' }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Additive and dosage">
              <Dl className="grid-cols-2">
                <KeyValue label="Booster / additive">{additive?.name ?? exp.additiveType}</KeyValue>
                <KeyValue label="Booster dosage">
                  <Val v={exp.boosterPpm} unit="ppm" className="text-lg font-semibold" />
                </KeyValue>
              </Dl>
            </Panel>
            <Panel title="Recorded performance" description="A blank RON was not measured.">
              <Dl>
                <KeyValue label="Measured RON">
                  <Val v={exp.ron} digits={1} className="text-lg font-semibold" />
                </KeyValue>
              </Dl>
            </Panel>
          </div>
          <Panel title="Laboratory observations">
            <p className="text-sm leading-relaxed text-ink">{exp.observations || NOT_RECORDED}</p>
          </Panel>
          <Panel title="Related experiments" description={`Other ${exp.blendId} runs, nearest booster dose first.`} bodyClassName="p-0">
            {related.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No other runs exist for this blend.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Booster</TableHead>
                    <TableHead className="text-right">Dose</TableHead>
                    <TableHead className="text-right">RON</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {related.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <ExpLink id={e.id} />
                      </TableCell>
                      <TableCell>{e.additiveType}</TableCell>
                      <TableCell className="text-right">
                        <Val v={e.boosterPpm} unit="ppm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Val v={e.ron} digits={1} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel title="Simulated analysis" action={<Pill tone="blue">Simulated</Pill>} description="Descriptive observations drawn from this dataset, not a prediction.">
            <ul className="flex flex-col gap-3">
              {analysis.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink">
                  {a}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Next actions">
            <div className="flex flex-col gap-1">
              <ActionLink href="/analysis/gasoline" label="Open gasoline blending analysis" />
              <ActionLink href="/recommendations" label="Review recommendations" />
              <ActionLink href="/testing-plan" label="View testing plan" />
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

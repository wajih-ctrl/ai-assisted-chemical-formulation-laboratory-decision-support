'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClipboardPlusIcon, PencilLineIcon, RotateCcwIcon, SearchCheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { plural } from '@/lib/format'
import type { Recommendation, RecommendationStatus, WorkflowId } from '@/lib/types'
import { Dl, EmptyNote, ExpLink, FormulationChip, GatedButton, KeyValue, Notice, PageHeader, Pill, Val, type Tone } from './primitives'
import { AddToPlanDialog, ModifyDialog, RejectDialog } from './recommendation-dialogs'

type Queue = 'active' | 'plan' | 'rejected'

const STATUS_TONE: Record<RecommendationStatus, Tone> = {
  Proposed: 'slate',
  'Under Review': 'amber',
  'Added to Plan': 'green',
  Rejected: 'rust',
}

function queueOf(r: Recommendation): Queue {
  if (r.status === 'Rejected') return 'rejected'
  if (r.status === 'Added to Plan') return 'plan'
  return 'active'
}

export function RecommendationsView() {
  const { state, actions, role } = useApp()
  const [workflow, setWorkflow] = useState<WorkflowId>(state.workflow)
  const [queue, setQueue] = useState<Queue>('active')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [modifyId, setModifyId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) setDetailId(hash)
  }, [])

  const inWorkflow = useMemo(() => state.recommendations.filter((r) => r.workflow === workflow), [state.recommendations, workflow])
  const counts = { active: 0, plan: 0, rejected: 0 }
  inWorkflow.forEach((r) => counts[queueOf(r)]++)
  const visible = inWorkflow.filter((r) => queueOf(r) === queue)
  const byId = (id: string | null) => (id ? state.recommendations.find((r) => r.id === id) ?? null : null)
  const canDecide = can(role, 'recommendation:decide')
  const canPlan = can(role, 'plan:create')

  const review = (r: Recommendation) => {
    actions.updateRecommendation(r.id, { status: 'Under Review' })
    actions.log('formulation-reviewed', `${r.id} opened for chemist review`, '/recommendations')
    setDetailId(r.id)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Planning"
        title="Plan the Next Experiment with Better Historical Context"
        description="Suggested tests are based on recorded coverage gaps. They are proposals for a chemist to weigh, never automatic decisions."
        actions={
          <Tabs value={workflow} onValueChange={(v) => { setWorkflow(v as WorkflowId); setQueue('active') }}>
            <TabsList aria-label="Workflow">
              <TabsTrigger value="demulsifier">Oilfield demulsifiers</TabsTrigger>
              <TabsTrigger value="gasoline">Gasoline blending</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <Notice tone="amber" title="Simulated recommendations" className="flex-1">
          Generated from the demo dataset for illustration. They do not predict performance.
        </Notice>
        <Notice tone="blue" title="Chemist approval required" className="flex-1">
          Nothing is scheduled or approved automatically. Each test needs an explicit chemist decision.
        </Notice>
      </div>

      <Tabs value={queue} onValueChange={(v) => setQueue(v as Queue)} className="mb-5">
        <TabsList aria-label="Recommendation queue">
          <TabsTrigger value="active">Active queue ({counts.active})</TabsTrigger>
          <TabsTrigger value="plan">In testing plan ({counts.plan})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyNote title={queue === 'active' ? 'The active queue is clear' : queue === 'plan' ? 'Nothing added to the plan yet' : 'No rejected recommendations'}>
          {queue === 'active' ? 'Every recommendation has been added to the plan or rejected.' : 'Recommendations appear here after you act on them.'}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((r) => (
            <li key={r.id}>
              <RecommendationPanel
                rec={r}
                canDecide={canDecide}
                canPlan={canPlan}
                onOpen={() => setDetailId(r.id)}
                onReview={() => review(r)}
                onModify={() => setModifyId(r.id)}
                onPlan={() => setPlanId(r.id)}
                onReject={() => setRejectId(r.id)}
                onRestore={() => {
                  actions.restoreRecommendation(r.id)
                  toast.success(`${r.id} restored to the active queue`)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <DetailSheet
        rec={byId(detailId)}
        onClose={() => {
          setDetailId(null)
          if (window.location.hash) history.replaceState(null, '', window.location.pathname)
        }}
        canDecide={canDecide}
        canPlan={canPlan}
        onModify={(id) => setModifyId(id)}
        onPlan={(id) => setPlanId(id)}
        onReject={(id) => setRejectId(id)}
      />
      <ModifyDialog rec={byId(modifyId)} onClose={() => setModifyId(null)} />
      <RejectDialog rec={byId(rejectId)} onClose={() => setRejectId(null)} />
      <AddToPlanDialog rec={byId(planId)} onClose={() => setPlanId(null)} />
    </div>
  )
}

function Parameters({ rec }: { rec: Recommendation }) {
  const isGas = rec.workflow === 'gasoline'
  return (
    <Dl className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <KeyValue label={isGas ? 'Additive' : 'Proposed formulation'}>
        <FormulationChip id={rec.formulationId} />
      </KeyValue>
      <KeyValue label={isGas ? 'Booster dosage' : 'Suggested dosage'}>
        <Val v={rec.dosagePpm} unit="ppm" />
      </KeyValue>
      {isGas ? (
        <KeyValue label="Base blend">{rec.blendId ?? 'Not specified'}</KeyValue>
      ) : (
        <>
          <KeyValue label="Crude sample">{rec.crudeId}</KeyValue>
          <KeyValue label="Temperature">
            <Val v={rec.tempC} unit="°C" />
          </KeyValue>
          <KeyValue label="Settling time">
            <Val v={rec.settlingMin} unit="min" />
          </KeyValue>
        </>
      )}
    </Dl>
  )
}

function RecommendationPanel({
  rec,
  canDecide,
  canPlan,
  onOpen,
  onReview,
  onModify,
  onPlan,
  onReject,
  onRestore,
}: {
  rec: Recommendation
  canDecide: boolean
  canPlan: boolean
  onOpen: () => void
  onReview: () => void
  onModify: () => void
  onPlan: () => void
  onReject: () => void
  onRestore: () => void
}) {
  const q = queueOf(rec)
  return (
    <article id={rec.id} className="panel flex flex-col" aria-labelledby={`${rec.id}-title`}>
      <header className="flex flex-col gap-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="tnum text-xs font-medium text-muted-foreground">{rec.id}</span>
          <Pill tone={STATUS_TONE[rec.status]}>{rec.status}</Pill>
          <Pill tone="amber">Simulated</Pill>
          {rec.modified ? <Pill tone="blue">Conditions modified</Pill> : null}
        </div>
        <h2 id={`${rec.id}-title`} className="font-heading text-base font-semibold leading-snug text-ink text-balance">
          {rec.title}
        </h2>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        <Parameters rec={rec} />
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          <KeyValue label="Why this test is suggested">
            <span className="leading-relaxed">{rec.rationale}</span>
          </KeyValue>
          <KeyValue label="Experimental coverage gap">
            <span className="leading-relaxed">{rec.coverageGap}</span>
          </KeyValue>
          <KeyValue label="Potential value for testing">
            <span className="leading-relaxed">{rec.value}</span>
          </KeyValue>
          <KeyValue label="Supporting historical experiments">
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {rec.supportingExperimentIds.map((id) => (
                <SupportRef key={id} id={id} />
              ))}
            </span>
          </KeyValue>
          {rec.expectedNote ? (
            <KeyValue label="Illustrative expected result" className="md:col-span-2">
              <span className="leading-relaxed text-muted-foreground">{rec.expectedNote}</span>
            </KeyValue>
          ) : null}
          {rec.rejectionReason ? (
            <KeyValue label="Rejection reason" className="md:col-span-2">
              {rec.rejectionReason}
            </KeyValue>
          ) : null}
          {rec.planId ? (
            <KeyValue label="Testing plan entry">
              <Link href="/testing-plan" className="tnum font-medium text-teal-ink underline-offset-2 hover:underline">
                {rec.planId}
              </Link>
            </KeyValue>
          ) : null}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        {q === 'active' ? (
          <>
            <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" onClick={onReview} variant={rec.status === 'Under Review' ? 'outline' : 'default'}>
              <SearchCheckIcon data-icon="inline-start" />
              Review recommendation
            </GatedButton>
            <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" variant="outline" onClick={onModify}>
              <PencilLineIcon data-icon="inline-start" />
              Modify test conditions
            </GatedButton>
            <GatedButton allowed={canPlan} capability="plan:create" size="sm" variant="outline" onClick={onPlan}>
              <ClipboardPlusIcon data-icon="inline-start" />
              Add to testing plan
            </GatedButton>
          </>
        ) : null}
        {q === 'rejected' ? (
          <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" variant="outline" onClick={onRestore}>
            <RotateCcwIcon data-icon="inline-start" />
            Restore to queue
          </GatedButton>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onOpen}>
          View supporting tests
        </Button>
        {q === 'active' ? (
          <span className="ml-auto">
            <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" variant="ghost" onClick={onReject}>
              <XIcon data-icon="inline-start" />
              Reject
            </GatedButton>
          </span>
        ) : null}
      </footer>
    </article>
  )
}

function SupportRef({ id }: { id: string }) {
  const { state } = useApp()
  return state.experiments.some((e) => e.id === id) ? <ExpLink id={id} /> : <span className="tnum font-medium text-ink">{id}</span>
}

function DetailSheet({
  rec,
  onClose,
  canDecide,
  canPlan,
  onModify,
  onPlan,
  onReject,
}: {
  rec: Recommendation | null
  onClose: () => void
  canDecide: boolean
  canPlan: boolean
  onModify: (id: string) => void
  onPlan: (id: string) => void
  onReject: (id: string) => void
}) {
  const { state } = useApp()
  const demExps = rec ? rec.supportingExperimentIds.map((id) => state.experiments.find((e) => e.id === id)).filter((e) => !!e) : []
  const gasExps = rec ? rec.supportingExperimentIds.map((id) => state.gasoline.find((g) => g.id === id)).filter((g) => !!g) : []
  const actionable = rec ? queueOf(rec) === 'active' : false

  return (
    <Sheet open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        {rec ? (
          <>
            <SheetHeader className="gap-1 border-b pr-12">
              <p className="eyebrow">Recommendation · {rec.id}</p>
              <SheetTitle className="font-heading text-lg leading-snug text-ink text-balance">{rec.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-1.5">
                <Pill tone={STATUS_TONE[rec.status]}>{rec.status}</Pill>
                <Pill tone="amber">Simulated</Pill>
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <section className="flex flex-col gap-2">
                <p className="eyebrow">Proposed parameters</p>
                <Parameters rec={rec} />
              </section>
              <section className="flex flex-col gap-2">
                <p className="eyebrow">Test rationale</p>
                <p className="text-sm leading-relaxed text-ink">{rec.rationale}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{rec.coverageGap}</p>
              </section>
              <section className="flex flex-col gap-2">
                <p className="eyebrow">Recorded comparable results · {plural(rec.supportingExperimentIds.length, 'experiment')}</p>
                {demExps.length ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Experiment</TableHead>
                          <TableHead className="text-right">Dosage (ppm)</TableHead>
                          <TableHead className="text-right">Temp (°C)</TableHead>
                          <TableHead className="text-right">Settling (min)</TableHead>
                          <TableHead className="text-right">Water sep. (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demExps.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <ExpLink id={e.id} />
                            </TableCell>
                            <TableCell className="text-right"><Val v={e.dosagePpm} /></TableCell>
                            <TableCell className="text-right"><Val v={e.tempC} /></TableCell>
                            <TableCell className="text-right"><Val v={e.settlingMin} /></TableCell>
                            <TableCell className="text-right"><Val v={e.waterSepPct} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
                {gasExps.length ? (
                  <div className="rounded-lg border">
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
                        {gasExps.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell className="tnum font-medium">{g.id}</TableCell>
                            <TableCell>{g.blendId}</TableCell>
                            <TableCell>{g.additiveType}</TableCell>
                            <TableCell className="text-right"><Val v={g.boosterPpm} /></TableCell>
                            <TableCell className="text-right"><Val v={g.ron} digits={1} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
                {!demExps.length && !gasExps.length ? <p className="text-sm text-muted-foreground">No recorded experiments are linked to this recommendation.</p> : null}
              </section>
              <Notice tone="slate" title="Scientific limitations">
                {rec.limitations}
              </Notice>
              {rec.expectedNote ? (
                <section className="flex flex-col gap-1">
                  <p className="eyebrow">Illustrative expected result</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{rec.expectedNote}</p>
                </section>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t p-4">
              {actionable ? (
                <>
                  <GatedButton allowed={canPlan} capability="plan:create" size="sm" onClick={() => { onClose(); onPlan(rec.id) }}>
                    <ClipboardPlusIcon data-icon="inline-start" />
                    Add to testing plan
                  </GatedButton>
                  <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" variant="outline" onClick={() => { onClose(); onModify(rec.id) }}>
                    <PencilLineIcon data-icon="inline-start" />
                    Modify
                  </GatedButton>
                  <span className="ml-auto">
                    <GatedButton allowed={canDecide} capability="recommendation:decide" size="sm" variant="ghost" onClick={() => { onClose(); onReject(rec.id) }}>
                      <XIcon data-icon="inline-start" />
                      Reject
                    </GatedButton>
                  </span>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Decision controls are available for recommendations in the active queue.</p>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftIcon, FuelIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { fmtDate, plural } from '@/lib/format'
import { EmptyNote, ExpLink, Notice, PageHeader, Panel, Pill, StatusPill, Val } from './primitives'
import { AppSelect } from './pickers'
import { CompositionChart, RonChart, ronPointsFor, type RonSeries } from './gasoline-charts'
import { ChecklistPanel, NextExperimentPanel, NonlinearPanel, SPEC_ITEMS, type CheckStatus } from './gasoline-sections'
import { AddToPlanDialog, ModifyDialog, RejectDialog } from './recommendation-dialogs'

export function GasolineView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const [blend, setBlend] = useState<string>('all')
  const [additive, setAdditive] = useState<string>('all')
  const [checkBlend, setCheckBlend] = useState<string>(state.blends[0]?.id ?? '')
  const [checks, setChecks] = useState<Record<string, Record<string, CheckStatus>>>({})
  const [modifyId, setModifyId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)

  const activeWorkflow = state.workflow
  const setWorkflow = actions.setWorkflow
  useEffect(() => {
    if (activeWorkflow !== 'gasoline') setWorkflow('gasoline')
  }, [activeWorkflow, setWorkflow])

  const additiveName = (id: string) => state.formulations.find((f) => f.id === id)?.name ?? id
  const canDecide = can(role, 'recommendation:decide')
  const canPlan = can(role, 'plan:create')
  const canEditChecklist = can(role, 'experiment:edit')

  const additiveOptions = useMemo(() => {
    const ids = Array.from(new Set(state.gasoline.map((e) => e.additiveType)))
    return [{ value: 'all', label: 'All additives' }, ...ids.map((id) => ({ value: id, label: state.formulations.find((f) => f.id === id)?.name ?? id }))]
  }, [state.gasoline, state.formulations])

  const matchesFilters = (blendId: string, additiveType: string) =>
    (blend === 'all' || blendId === blend) && (additive === 'all' || additiveType === additive)

  const experiments = useMemo(
    () =>
      state.gasoline
        .filter((e) => matchesFilters(e.blendId, e.additiveType))
        .sort((a, b) => a.blendId.localeCompare(b.blendId) || (a.boosterPpm ?? 0) - (b.boosterPpm ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.gasoline, blend, additive],
  )

  const visibleBlends = useMemo(
    () => state.blends.filter((b) => (blend === 'all' || b.id === blend) && (additive === 'all' || state.gasoline.some((e) => e.blendId === b.id && e.additiveType === additive))),
    [state.blends, state.gasoline, blend, additive],
  )

  const series: RonSeries[] = useMemo(
    () =>
      visibleBlends
        .map((b) => ({
          blendId: b.id,
          color: b.color,
          points: ronPointsFor(
            experiments.filter((e) => e.blendId === b.id),
            (id) => state.formulations.find((f) => f.id === id)?.name ?? id,
          ),
        }))
        .filter((s) => s.points.length > 0),
    [visibleBlends, experiments, state.formulations],
  )

  const focusBlendId = blend !== 'all' ? blend : state.blends.find((b) => b.id === 'GB-A01')?.id ?? state.blends[0]?.id ?? ''
  const focusPoints = useMemo(
    () =>
      ronPointsFor(
        state.gasoline.filter((e) => e.blendId === focusBlendId && (additive === 'all' || e.additiveType === additive)),
        (id) => state.formulations.find((f) => f.id === id)?.name ?? id,
      ),
    [state.gasoline, state.formulations, focusBlendId, additive],
  )
  const focusAdditive = focusPoints.length
    ? state.gasoline.find((e) => e.id === focusPoints[0].id)?.additiveType ?? ''
    : ''

  const openRecs = state.recommendations.filter(
    (r) => r.workflow === 'gasoline' && (r.status === 'Proposed' || r.status === 'Under Review') && (blend === 'all' || r.blendId === blend),
  )

  const checklistBlendId = blend !== 'all' ? blend : checkBlend
  const checklistStatuses = checks[checklistBlendId] ?? {}
  const updateCheck = (itemId: string, status: CheckStatus) => {
    setChecks((c) => ({ ...c, [checklistBlendId]: { ...(c[checklistBlendId] ?? {}), [itemId]: status } }))
    const name = SPEC_ITEMS.find((i) => i.id === itemId)?.name ?? itemId
    toast.success(`${name} for ${checklistBlendId} set to ${status}`)
  }

  const byId = (id: string | null) => (id ? state.recommendations.find((r) => r.id === id) ?? null : null)

  const resetFilters = blend !== 'all' || additive !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analysis · Gasoline workflow"
        title="Gasoline Blend Screening & RON Analysis"
        description="Review how measured RON responds to booster dosage across base blends. Illustrative records only; no specification is confirmed."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">
              <FuelIcon className="size-3" aria-hidden /> Gasoline workflow
            </Pill>
            <Pill tone="amber">Illustrative prototype</Pill>
          </div>
        }
        actions={
          <Button variant="outline" render={<Link href="/workflows" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Chemical Workflows
          </Button>
        }
      />

      <div className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={blend} onValueChange={(v) => setBlend(String(v))}>
          <TabsList>
            <TabsTrigger value="all">All blends</TabsTrigger>
            {state.blends.map((b) => (
              <TabsTrigger key={b.id} value={b.id}>
                {b.id}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <AppSelect aria-label="Filter by additive" value={additive} onChange={setAdditive} options={additiveOptions} />
          </div>
          <p className="text-xs text-muted-foreground">
            {plural(experiments.length, 'experiment')} shown of {state.gasoline.length}
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={!resetFilters}
            onClick={() => {
              setBlend('all')
              setAdditive('all')
            }}
          >
            Reset filters
          </Button>
        </div>
      </div>

      <Panel title="Blend composition overview" description="Base blend proportions by component, with the additive and dosage range recorded for each blend.">
        {visibleBlends.length === 0 ? (
          <EmptyNote title="No blends match these filters" />
        ) : (
          <div className="flex flex-col gap-4">
            <CompositionChart blends={visibleBlends} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blend ID</TableHead>
                  <TableHead>Components and proportions</TableHead>
                  <TableHead>Additive type</TableHead>
                  <TableHead className="text-right">Additive dosage tested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleBlends.map((b) => {
                  const exps = state.gasoline.filter((e) => e.blendId === b.id && e.boosterPpm !== null)
                  const doses = exps.map((e) => e.boosterPpm as number)
                  const additives = Array.from(new Set(exps.map((e) => additiveName(e.additiveType))))
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                          {b.id}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal">{b.components.map((c) => `${c.name} ${c.pct} %`).join(' · ')}</TableCell>
                      <TableCell className="whitespace-normal">{additives.join(', ') || 'Not recorded'}</TableCell>
                      <TableCell className="tnum text-right">{doses.length ? `${Math.min(...doses)}–${Math.max(...doses)} ppm` : 'Not recorded'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel
        title="Booster dosage vs measured RON"
        description="Each marker is one recorded determination. Lines join markers within a blend. The RON axis does not start at zero. Select a marker to open its experiment."
      >
        {series.length === 0 ? (
          <EmptyNote title="No measured RON for these filters">Planned experiments without a recorded RON are not plotted.</EmptyNote>
        ) : (
          <RonChart series={series} onSelect={(id) => router.push(`/experiments/${id}`)} />
        )}
      </Panel>

      <Panel title="Blend comparison table" description="Recorded results behind the chart, including planned tests that have no RON yet.">
        {experiments.length === 0 ? (
          <EmptyNote title="No experiments match these filters" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Experiment</TableHead>
                <TableHead>Blend ID</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Proportions</TableHead>
                <TableHead>Additive type</TableHead>
                <TableHead className="text-right">Dosage (ppm)</TableHead>
                <TableHead className="text-right">Measured RON</TableHead>
                <TableHead>Test date</TableHead>
                <TableHead className="min-w-56">Laboratory observations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {experiments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <ExpLink id={e.id} />
                  </TableCell>
                  <TableCell className="font-medium text-ink">{e.blendId}</TableCell>
                  <TableCell className="whitespace-normal text-xs">{e.components.map((c) => c.name).join(', ')}</TableCell>
                  <TableCell className="tnum whitespace-nowrap text-xs">{e.components.map((c) => c.pct).join(' / ')} %</TableCell>
                  <TableCell>{additiveName(e.additiveType)}</TableCell>
                  <TableCell className="text-right">
                    <Val v={e.boosterPpm} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Val v={e.ron} digits={1} />
                  </TableCell>
                  <TableCell className="tnum whitespace-nowrap">{fmtDate(e.testDate)}</TableCell>
                  <TableCell className="whitespace-normal text-xs leading-relaxed text-muted-foreground">
                    <div className="flex flex-col items-start gap-1">
                      {e.status !== 'Completed' ? <StatusPill status={e.status} /> : null}
                      <span>{e.observations}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <NonlinearPanel blendId={focusBlendId} additiveName={additiveName(focusAdditive)} points={focusPoints} />
        <NextExperimentPanel
          recs={openRecs}
          canDecide={canDecide}
          canPlan={canPlan}
          additiveName={additiveName}
          onModify={setModifyId}
          onPlan={setPlanId}
          onReject={setRejectId}
        />
      </div>

      <ChecklistPanel
        blendLabel={checklistBlendId}
        statuses={checklistStatuses}
        canEdit={canEditChecklist}
        onChange={updateCheck}
        blendPicker={
          blend === 'all' ? (
            <div className="w-44">
              <AppSelect
                aria-label="Blend for checklist"
                value={checkBlend}
                onChange={setCheckBlend}
                options={state.blends.map((b) => ({ value: b.id, label: b.id }))}
              />
            </div>
          ) : null
        }
      />

      <Notice tone="blue" title="Scope of this view">
        This screen summarises recorded gasoline screening results. It does not simulate or optimise blend composition, and it does not predict RON for untested dosages.
      </Notice>

      <ModifyDialog rec={byId(modifyId)} onClose={() => setModifyId(null)} />
      <RejectDialog rec={byId(rejectId)} onClose={() => setRejectId(null)} />
      <AddToPlanDialog rec={byId(planId)} onClose={() => setPlanId(null)} />
    </div>
  )
}

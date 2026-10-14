'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  Columns2Icon,
  DatabaseIcon,
  FlaskConicalIcon,
  HistoryIcon,
  PlusIcon,
  SparklesIcon,
  UploadCloudIcon,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { ROLE_LABEL } from '@/lib/roles'
import { buildDoseSeries } from '@/lib/analysis'
import { fmtDate, fmtDateTime, plural } from '@/lib/format'
import { DoseResponseChart } from './dose-chart'
import { ExperimentDrawer } from './experiment-drawer'
import { RonChart, ronPointsFor, type RonSeries } from './gasoline-charts'
import { FormulationChip, Notice, PageHeader, Panel, Pill, StatusPill } from './primitives'

function Stat({ label, value, note, href, icon: Icon }: { label: string; value: string | number; note: string; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="group block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
      <div className="panel relative flex h-full min-h-36 flex-col overflow-hidden p-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_18px_40px_-26px_rgba(10,143,133,0.6)]">
        <span className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/[0.045] transition-transform duration-300 group-hover:scale-150" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <p className="eyebrow">{label}</p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden><Icon className="size-4" /></span>
        </div>
        <p className="tnum relative mt-3 font-heading text-[2.15rem] font-semibold leading-none tracking-tight text-ink">{value}</p>
        <p className="relative mt-auto pt-2 text-xs leading-snug text-muted-foreground">{note}</p>
      </div>
    </Link>
  )
}

export function DashboardView() {
  const { state, user, role } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const isGas = state.workflow === 'gasoline'
  const workflowRecords = isGas ? state.gasoline : state.experiments

  const reviewedFormulations = useMemo(() => {
    const ids = [...workflowRecords]
      .filter((experiment) => ['Completed', 'Under Review'].includes(experiment.status))
      .sort((a, b) => b.testDate.localeCompare(a.testDate))
      .map((experiment) => 'additiveType' in experiment ? experiment.additiveType : experiment.formulationId)
    return Array.from(new Set(ids)).slice(0, 6)
  }, [workflowRecords])

  const stats = useMemo(() => {
    const formulationIds = new Set(workflowRecords.map((experiment) => 'additiveType' in experiment ? experiment.additiveType : experiment.formulationId))
    return {
      total: workflowRecords.length,
      formulations: formulationIds.size,
      datasets: state.datasets.filter((dataset) => dataset.workflow === state.workflow).length,
      completed: workflowRecords.filter((experiment) => experiment.status === 'Completed').length,
      pending: workflowRecords.filter((experiment) => ['Planned', 'Pending', 'In Progress', 'Under Review'].includes(experiment.status)).length,
      reviewed: reviewedFormulations.length,
    }
  }, [reviewedFormulations, state.datasets, state.workflow, workflowRecords])

  const demSeries = useMemo(
    () => buildDoseSeries(state.experiments, ['DM-A101', 'DM-B205'], { crudeId: 'CR-101', tempC: 60, settlingMin: 30 }, true),
    [state.experiments],
  )

  const gasSeries = useMemo<RonSeries[]>(
    () => state.blends
      .map((blend) => ({
        blendId: blend.id,
        color: blend.color,
        points: ronPointsFor(
          state.gasoline.filter((experiment) => experiment.blendId === blend.id),
          (id) => state.formulations.find((formulation) => formulation.id === id)?.name ?? id,
        ),
      }))
      .filter((series) => series.points.length > 0),
    [state.blends, state.formulations, state.gasoline],
  )

  const recentResults = useMemo(
    () => [...workflowRecords]
      .filter((experiment) => 'ron' in experiment ? experiment.ron !== null : experiment.waterSepPct !== null)
      .sort((a, b) => b.testDate.localeCompare(a.testDate))
      .slice(0, 5),
    [workflowRecords],
  )

  const performance = useMemo(() => {
    const categoryIds = new Set(state.categories.filter((category) => category.workflow === state.workflow).map((category) => category.id))
    return state.formulations
      .filter((formulation) => categoryIds.has(formulation.categoryId))
      .map((formulation) => {
        const experiments = isGas
          ? state.gasoline.filter((experiment) => experiment.additiveType === formulation.id)
          : state.experiments.filter((experiment) => experiment.formulationId === formulation.id)
        const values = experiments
          .map((experiment) => 'ron' in experiment ? experiment.ron : experiment.waterSepPct)
          .filter((value): value is number => value !== null)
        return {
          formulation,
          tests: experiments.length,
          results: values.length,
          mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
          latest: experiments.length ? [...experiments].sort((a, b) => b.testDate.localeCompare(a.testDate))[0].testDate : null,
        }
      })
      .sort((a, b) => b.tests - a.tests || a.formulation.id.localeCompare(b.formulation.id))
  }, [isGas, state.categories, state.experiments, state.formulations, state.gasoline, state.workflow])

  const insights = state.insights.filter((insight) => insight.workflow === state.workflow).slice(0, 2)
  const recommendations = state.recommendations
    .filter((recommendation) => recommendation.workflow === state.workflow && ['Proposed', 'Under Review'].includes(recommendation.status))
    .slice(0, 3)
  const recentActivity = state.activity.slice(0, 7)
  const myTests = state.plan.filter((item) => item.assigneeId === user.id && !['Completed', 'Cancelled'].includes(item.status))
  const first = user.name.replace(/^Dr\.\s*/, '').split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow={`${ROLE_LABEL[role]} · ${isGas ? 'Gasoline Blending Additives' : 'Oilfield Demulsifiers'}`}
        title={`Welcome back, ${first}`}
        description="A decision-ready view of laboratory results, formulation coverage, emerging patterns and proposed next work. All values are illustrative demo data."
        actions={
          <Button variant="outline" render={<Link href={isGas ? '/analysis/gasoline' : '/analysis/demulsifier'} />}>
            Open full analysis
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <section className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between" aria-labelledby="dashboard-quick-actions">
          <div>
            <h2 id="dashboard-quick-actions" className="font-heading text-base font-semibold text-ink">Quick actions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Move from historical data to a laboratory decision without losing context.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" size="sm" render={<Link href="/data/upload" />}><UploadCloudIcon data-icon="inline-start" />Upload Data</Button>
            <Button variant="outline" size="sm" render={<Link href="/experiments/new" />}><PlusIcon data-icon="inline-start" />Add Experiment</Button>
            <Button variant="outline" size="sm" render={<Link href="/comparison" />}><Columns2Icon data-icon="inline-start" />Compare Formulations</Button>
            <Button size="sm" render={<Link href="/insights" />}><SparklesIcon data-icon="inline-start" />View Insights</Button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          <Stat label="Total experiments" value={stats.total} note={`All ${isGas ? 'blend-screening' : 'bottle-test'} records`} href="/experiments" icon={FlaskConicalIcon} />
          <Stat label="Formulations tested" value={stats.formulations} note="Distinct formulations represented" href="/experiments" icon={Columns2Icon} />
          <Stat label="Historical datasets" value={stats.datasets} note="Available for this workflow" href="/data/upload" icon={DatabaseIcon} />
          <Stat label="Completed tests" value={stats.completed} note="Completed with recorded outcomes" href="/experiments" icon={CheckCircle2Icon} />
          <Stat label="Pending tests" value={stats.pending} note="Planned, pending, active or in review" href="/testing-plan" icon={Clock3Icon} />
          <Stat label="Recently reviewed" value={stats.reviewed} note="Formulations in the latest reviewed records" href="/experiments" icon={HistoryIcon} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <Panel
            title={isGas ? 'Booster dosage versus measured RON' : 'Dosage versus water separation'}
            description={isGas ? 'Recorded gasoline screening results across base blends. Select a point to open its experiment.' : 'Matched bottle-test conditions: CR-101, 60 °C and 30 min settling. Select a point to inspect the record.'}
            action={<Button variant="ghost" size="sm" render={<Link href={isGas ? '/analysis/gasoline' : '/analysis/demulsifier'} />}>Full analysis<ArrowRightIcon data-icon="inline-end" /></Button>}
          >
            {isGas ? (
              <RonChart series={gasSeries} height={300} onSelect={(id) => router.push(`/experiments/${id}`)} />
            ) : (
              <DoseResponseChart series={demSeries} formulations={state.formulations} height={300} onSelect={setOpen} selectedId={open} />
            )}
            <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
              {isGas ? 'Lines join recorded measurements within each blend; they are not predictions.' : 'Lines join means at matched conditions. Untested dosages are not estimated.'}
            </p>
          </Panel>

          <Panel title={isGas ? 'Recent gasoline results' : 'Recent bottle-test results'} description="Latest recorded laboratory outcomes, with blanks excluded rather than treated as zero.">
            <ul className="flex flex-col divide-y">
              {recentResults.map((experiment) => {
                const gas = 'ron' in experiment
                const formulationId = gas ? experiment.additiveType : experiment.formulationId
                return (
                  <li key={experiment.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/experiments/${experiment.id}`} className="tnum text-sm font-semibold text-teal-ink hover:underline">{experiment.id}</Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2"><FormulationChip id={formulationId} /><StatusPill status={experiment.status} /></div>
                      </div>
                      <p className="tnum shrink-0 text-right text-sm font-semibold text-ink">
                        {gas ? `${experiment.ron?.toFixed(1)} RON` : `${experiment.waterSepPct?.toFixed(1)} %`}
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {gas ? `${experiment.blendId} · ${experiment.boosterPpm ?? 'Not measured'} ppm` : `${experiment.crudeId} · ${experiment.dosagePpm ?? 'Not measured'} ppm · ${experiment.tempC ?? 'Not measured'} °C`} · {fmtDate(experiment.testDate)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Potential experimental patterns" description="Simulated observations grounded in the cited historical records.">
            <div className="flex flex-col gap-3">
              {insights.map((insight) => (
                <Link key={insight.id} href={`/insights#${insight.id}`} className="group rounded-xl border bg-muted/25 p-3 outline-none transition-colors hover:border-primary/30 hover:bg-teal-soft/30 focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-soft text-amber-ink" aria-hidden><SparklesIcon className="size-4" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-ink group-hover:text-teal-ink">{insight.title}</h3><Pill tone="amber">Simulated</Pill></div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.observation}</p>
                      <p className="mt-2 text-xs font-medium text-teal-ink">{plural(insight.experimentIds.length, 'supporting experiment')} · Review evidence</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Suggested next experiments" description="Illustrative proposals awaiting a chemist’s review, modification or rejection." action={<Button variant="ghost" size="sm" render={<Link href="/recommendations" />}>Review queue<ArrowRightIcon data-icon="inline-end" /></Button>}>
            <div className="flex flex-col divide-y">
              {recommendations.length ? recommendations.map((recommendation) => (
                <article key={recommendation.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-semibold leading-snug text-ink">{recommendation.title}</p><p className="tnum mt-1 text-xs text-muted-foreground">{recommendation.id} · {recommendation.dosagePpm} ppm{recommendation.tempC !== null ? ` · ${recommendation.tempC} °C` : ''}</p></div>
                    <StatusPill status={recommendation.status} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{recommendation.coverageGap}</p>
                </article>
              )) : <p className="py-3 text-sm text-muted-foreground">No open proposals for this workflow.</p>}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Formulation performance overview" description={`Recorded ${isGas ? 'RON' : 'water-separation'} coverage by formulation. Means summarise observations; they are not rankings.`}>
            <ul className="flex flex-col divide-y">
              {performance.map(({ formulation, tests, results, mean, latest }) => (
                <li key={formulation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><FormulationChip id={formulation.id} color={formulation.color} /><StatusPill status={formulation.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{formulation.name} · {plural(tests, 'test')} · {plural(results, 'result')}{latest ? ` · latest ${fmtDate(latest)}` : ''}</p></div>
                  <div className="text-right"><p className="tnum text-sm font-semibold text-ink">{mean === null ? 'Not measured' : `${mean.toFixed(1)}${isGas ? ' RON' : ' %'}`}</p><p className="text-[11px] text-muted-foreground">recorded mean</p></div>
                </li>
              ))}
            </ul>
            {!isGas ? <Notice tone="blue" className="mt-3">Comparisons are meaningful only when crude sample, temperature and settling conditions are matched.</Notice> : null}
          </Panel>

          <Panel title="Recent laboratory activity" description="Session changes, reviews, imports and testing-plan events.">
            <ol className="flex flex-col">
              {recentActivity.map((activity) => {
                const actor = state.users.find((candidate) => candidate.id === activity.actorId)
                return (
                  <li key={activity.id} className="flex items-start gap-3 border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                    <ClipboardCheckIcon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                    <div className="flex min-w-0 flex-col gap-0.5"><p className="text-sm leading-snug text-ink">{activity.href ? <Link href={activity.href} className="hover:underline">{activity.text}</Link> : activity.text}</p><p className="text-xs text-muted-foreground">{actor?.name ?? 'System'} · {fmtDateTime(activity.at)}</p></div>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>

        {role === 'technician' ? (
          <Panel title="Your assigned tests" description="Planned laboratory work assigned to you.">
            {myTests.length ? (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {myTests.map((item) => <li key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-ink">{item.title}</p><StatusPill status={item.status} /></div><p className="tnum mt-2 text-xs text-muted-foreground">{item.id} · {item.formulationId} · {item.dosagePpm} ppm</p></li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No tests are currently assigned to you.</p>}
          </Panel>
        ) : null}
      </div>

      <ExperimentDrawer id={open} onClose={() => setOpen(null)} />
    </>
  )
}

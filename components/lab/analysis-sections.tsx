'use client'

import Link from 'next/link'
import { ArrowRightIcon, ClipboardListIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { can } from '@/lib/roles'
import { mean } from '@/lib/format'
import { hasResult, mismatchReasons, type DoseSeries, type ReferenceConditions } from '@/lib/analysis'
import type { Experiment, Formulation, Recommendation, RoleId } from '@/lib/types'
import { ExpLink, FormulationChip, GatedButton, Notice, Pill, StatusPill, Val } from './primitives'

/* ----------------------------- Observation ----------------------------- */

export interface Observation {
  formulationId: string
  lowDose: number
  highDose: number
  lowMean: number
  highMean: number
  delta: number
  diminishing: boolean
  refIds: string[]
}

export function deriveObservation(series: DoseSeries | undefined): Observation | null {
  if (!series || series.means.length < 2) return null
  const lo = series.means[series.means.length - 2]
  const hi = series.means[series.means.length - 1]
  const delta = hi.y - lo.y
  const refIds = series.points.filter((p) => p.mismatch.length === 0 && (p.x === lo.x || p.x === hi.x)).map((p) => p.id)
  return {
    formulationId: series.formulationId,
    lowDose: lo.x,
    highDose: hi.x,
    lowMean: lo.y,
    highMean: hi.y,
    delta,
    diminishing: delta <= 5,
    refIds,
  }
}

export function ObservationPanel({
  obs,
  refCond,
  crudeName,
  onOpen,
}: {
  obs: Observation | null
  refCond: ReferenceConditions
  crudeName: string
  onOpen: (id: string) => void
}) {
  if (!obs) {
    return (
      <Notice tone="slate" title="Not enough matched dosage levels">
        At least two dosage levels recorded under the selected conditions are needed before a dosage observation can be described. Widen the scope or add experiments.
      </Notice>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={obs.diminishing ? 'amber' : 'teal'}>{obs.diminishing ? 'Potential diminishing returns' : 'Continued increase observed'}</Pill>
        <span className="text-xs text-muted-foreground">
          {obs.formulationId} · {refCond.crudeId} {crudeName} · {refCond.tempC} °C · {refCond.settlingMin} min
        </span>
      </div>
      <p className="text-sm leading-relaxed text-ink text-pretty">
        Within the selected comparable conditions, <span className="font-medium">{obs.formulationId}</span> recorded{' '}
        <span className="tnum font-medium">{obs.lowMean.toFixed(0)} %</span> water separation at {obs.lowDose} ppm and{' '}
        <span className="tnum font-medium">{obs.highMean.toFixed(0)} %</span> at {obs.highDose} ppm, a difference of{' '}
        <span className="tnum font-medium">{obs.delta.toFixed(0)}</span> percentage points.{' '}
        {obs.diminishing
          ? 'The additional separation per added ppm is small across this range, which may indicate diminishing returns. The recorded data do not show where the change in slope begins.'
          : 'Separation is still increasing across this range, so the recorded data do not yet indicate a plateau.'}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>Supporting experiments:</span>
        {obs.refIds.map((id) => (
          <button key={id} type="button" onClick={() => onOpen(id)} className="tnum inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-ink underline-offset-2 hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
            {id}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Matrix -------------------------------- */

export function ComparisonMatrix({
  rows,
  refCond,
  formulations,
  selected,
  onToggle,
  onOpen,
}: {
  rows: Experiment[]
  refCond: ReferenceConditions
  formulations: Formulation[]
  selected: string[]
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Select for comparison</span>
            </TableHead>
            <TableHead>Experiment</TableHead>
            <TableHead>Formulation</TableHead>
            <TableHead className="text-right">Dose (ppm)</TableHead>
            <TableHead className="text-right">Temp (°C)</TableHead>
            <TableHead className="text-right">Settling (min)</TableHead>
            <TableHead className="text-right">Water sep. (%)</TableHead>
            <TableHead className="text-right">Residual water (%)</TableHead>
            <TableHead>Rag layer</TableHead>
            <TableHead>Clarity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Conditions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            const diff = mismatchReasons(e, refCond)
            return (
              <TableRow key={e.id} data-state={selected.includes(e.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => onToggle(e.id)} aria-label={`Select ${e.id} for comparison`} />
                </TableCell>
                <TableCell>
                  <button type="button" onClick={() => onOpen(e.id)} className="tnum inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-ink underline-offset-2 hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                    {e.id}
                  </button>
                </TableCell>
                <TableCell>
                  <FormulationChip id={e.formulationId} color={formulations.find((f) => f.id === e.formulationId)?.color} />
                </TableCell>
                <TableCell className="text-right">
                  <Val v={e.dosagePpm} />
                </TableCell>
                <TableCell className="text-right">
                  <Val v={e.tempC} />
                </TableCell>
                <TableCell className="text-right">
                  <Val v={e.settlingMin} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Val v={e.waterSepPct} />
                </TableCell>
                <TableCell className="text-right">
                  <Val v={e.residualWaterPct} digits={1} />
                </TableCell>
                <TableCell className="text-sm">{e.ragLayer ?? <span className="text-xs italic text-subtle">Not measured</span>}</TableCell>
                <TableCell className="text-sm">{e.clarity ?? <span className="text-xs italic text-subtle">Not measured</span>}</TableCell>
                <TableCell>
                  <StatusPill status={e.status} />
                </TableCell>
                <TableCell>
                  {diff.length === 0 ? (
                    <Pill tone="teal">Matched</Pill>
                  ) : (
                    <span title={diff.join('; ')}>
                      <Pill tone="amber">Differs: {diff.length === 1 ? diff[0] : `${diff.length} conditions`}</Pill>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/* ------------------------------ Coverage ------------------------------- */

export function CoverageGrid({
  exps,
  formulationId,
  crudeId,
  settlingMin,
  doses,
  temps,
  onOpen,
}: {
  exps: Experiment[]
  formulationId: string
  crudeId: string
  settlingMin: number
  doses: number[]
  temps: number[]
  onOpen: (id: string) => void
}) {
  const cell = (dose: number, temp: number) => {
    const list = exps.filter(
      (e) => e.formulationId === formulationId && e.crudeId === crudeId && e.settlingMin === settlingMin && e.dosagePpm === dose && e.tempC === temp,
    )
    const done = list.filter(hasResult)
    const open = list.filter((e) => ['In Progress', 'Pending', 'Planned'].includes(e.status))
    return { done, open }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
        <caption className="sr-only">
          Recorded water separation for {formulationId} on {crudeId} at {settlingMin} minutes settling, by dosage and temperature
        </caption>
        <thead>
          <tr>
            <th scope="col" className="p-1 text-left text-xs font-medium text-muted-foreground">
              Dose \ Temp
            </th>
            {temps.map((t) => (
              <th key={t} scope="col" className="tnum p-1 text-center text-xs font-medium text-muted-foreground">
                {t} °C
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doses.map((d) => (
            <tr key={d}>
              <th scope="row" className="tnum whitespace-nowrap p-1 text-left text-xs font-medium text-muted-foreground">
                {d} ppm
              </th>
              {temps.map((t) => {
                const { done, open } = cell(d, t)
                if (done.length > 0) {
                  const m = mean(done.map((e) => e.waterSepPct as number)) as number
                  return (
                    <td key={t} className="p-0">
                      <button
                        type="button"
                        onClick={() => onOpen(done[0].id)}
                        aria-label={`${d} ppm at ${t} °C: ${m.toFixed(0)} percent from ${done.length} experiment${done.length === 1 ? '' : 's'}. Open ${done[0].id}`}
                        className="flex h-11 w-full flex-col items-center justify-center rounded-md bg-teal-soft text-teal-ink transition-colors hover:bg-teal-soft/70 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="tnum text-sm font-semibold">{m.toFixed(0)} %</span>
                        {done.length > 1 ? <span className="text-[10px] leading-none opacity-80">n = {done.length}</span> : null}
                      </button>
                    </td>
                  )
                }
                if (open.length > 0)
                  return (
                    <td key={t} className="p-0">
                      <button
                        type="button"
                        onClick={() => onOpen(open[0].id)}
                        aria-label={`${d} ppm at ${t} °C: ${open[0].status.toLowerCase()}. Open ${open[0].id}`}
                        className="flex h-11 w-full items-center justify-center rounded-md bg-amber-soft text-xs font-medium text-amber-ink hover:bg-amber-soft/70 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {open[0].status}
                      </button>
                    </td>
                  )
                return (
                  <td key={t} className="p-0">
                    <div className="flex h-11 items-center justify-center rounded-md border border-dashed text-xs text-subtle">Untested</div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Proposal -------------------------------- */

export function SuggestedTest({
  rec,
  role,
  onAdd,
  expOpen,
}: {
  rec: Recommendation | undefined
  role: RoleId
  onAdd: (rec: Recommendation) => void
  expOpen: (id: string) => void
}) {
  if (!rec)
    return (
      <Notice tone="slate" title="No open suggestion for this scope">
        No suggested next test is currently proposed for the selected formulation, crude sample and conditions. Change the scope or review all recommendations.
        <div className="pt-2">
          <Link href="/recommendations" className="inline-flex items-center gap-1 text-sm font-medium text-teal-ink hover:underline">
            Open Next-Test Recommendations <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
      </Notice>
    )
  const added = rec.status === 'Added to Plan'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-ink">{rec.title}</h3>
          <Pill tone={added ? 'green' : 'blue'}>{added ? 'In testing plan' : rec.status}</Pill>
        </div>
        <p className="tnum text-sm text-muted-foreground">
          {rec.formulationId} · {rec.crudeId} · {rec.dosagePpm} ppm · {rec.tempC ?? 'n/a'} °C · {rec.settlingMin ?? 'n/a'} min
        </p>
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Why this test</dt>
          <dd className="leading-relaxed text-ink">{rec.rationale}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Coverage gap</dt>
          <dd className="leading-relaxed text-ink">{rec.coverageGap}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Value of the result</dt>
          <dd className="leading-relaxed text-ink">{rec.value}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Limitations</dt>
          <dd className="leading-relaxed text-ink">{rec.limitations}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>Evidence:</span>
        {rec.supportingExperimentIds.map((id) => (
          <button key={id} type="button" onClick={() => expOpen(id)} className="tnum inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-ink underline-offset-2 hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
            {id}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-3">
        {added ? (
          <Link href="/testing-plan" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-ink hover:underline">
            <ClipboardListIcon className="size-4" aria-hidden /> View {rec.planId ?? 'plan item'} in Testing Plan
          </Link>
        ) : (
          <GatedButton allowed={can(role, 'plan:create')} capability="plan:create" onClick={() => onAdd(rec)}>
            Add to testing plan
          </GatedButton>
        )}
        <span className={cn('text-xs text-muted-foreground')}>Chemist approval is required before the test is scheduled. This is a suggestion, not a prediction.</span>
      </div>
    </div>
  )
}


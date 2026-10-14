'use client'

import { ClipboardListIcon, PencilIcon, XIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Recommendation } from '@/lib/types'
import { Dl, EmptyNote, ExpLink, GatedButton, KeyValue, Notice, Panel, Pill, StatusPill, Val, type Tone } from './primitives'
import { AppSelect } from './pickers'
import type { RonPoint } from './gasoline-charts'

/* ------------------------- Nonlinear dosage response ------------------------- */

interface Step {
  from: RonPoint
  to: RonPoint
  deltaRon: number
  deltaPpm: number
  per100: number
}

function stepsOf(points: RonPoint[]): Step[] {
  const out: Step[] = []
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]
    const to = points[i]
    const deltaPpm = to.x - from.x
    if (deltaPpm <= 0) continue
    const deltaRon = to.y - from.y
    out.push({ from, to, deltaRon, deltaPpm, per100: (deltaRon / deltaPpm) * 100 })
  }
  return out
}

export function NonlinearPanel({ blendId, additiveName, points }: { blendId: string; additiveName: string; points: RonPoint[] }) {
  const steps = stepsOf(points)
  const maxPer100 = Math.max(0.01, ...steps.map((s) => Math.abs(s.per100)))
  const first = steps[0]
  const last = steps[steps.length - 1]
  const smaller = steps.length >= 2 && last.per100 < first.per100 * 0.6

  return (
    <Panel
      title="Illustrative nonlinear dosage response"
      description={`${blendId} with ${additiveName}. Increment in measured RON per 100 ppm between neighbouring recorded dosages.`}
    >
      {steps.length < 2 ? (
        <EmptyNote title="Not enough recorded dosage levels">Three or more measured dosage levels are needed to compare increments for {blendId}.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink">
            {smaller
              ? `Within ${blendId}, the recorded RON increment per added ppm is smaller at higher booster dosage: ${first.deltaRon.toFixed(1)} RON between ${first.from.x} and ${first.to.x} ppm, versus ${last.deltaRon.toFixed(1)} RON between ${last.from.x} and ${last.to.x} ppm. This describes the recorded points only.`
              : `Within ${blendId}, the recorded RON increments do not show a clearly smaller step at higher dosage across the measured range.`}
          </p>
          <ul className="flex flex-col gap-2.5" aria-label="RON increment per dosage step">
            {steps.map((s) => (
              <li key={`${s.from.id}-${s.to.id}`} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <span className="tnum font-medium text-ink">
                    {s.from.x} → {s.to.x} ppm
                  </span>
                  <span className="tnum text-muted-foreground">
                    +{s.deltaRon.toFixed(1)} RON · {s.per100.toFixed(2)} per 100 ppm
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted" aria-hidden>
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(4, (Math.abs(s.per100) / maxPer100) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="eyebrow">Historical references</span>
              {points.map((p) => (
                <ExpLink key={p.id} id={p.id} />
              ))}
            </p>
          </div>
          <Notice tone="amber" title="Testing limitations">
            Each dosage level is a single determination, and only {points.length} levels were tested. The shape of the response between measured points is not characterised, and no prediction is made outside the tested range.
          </Notice>
        </div>
      )}
    </Panel>
  )
}

/* --------------------------- Next gasoline experiment --------------------------- */

export function NextExperimentPanel({
  recs,
  canDecide,
  canPlan,
  additiveName,
  onModify,
  onPlan,
  onReject,
}: {
  recs: Recommendation[]
  canDecide: boolean
  canPlan: boolean
  additiveName: (id: string) => string
  onModify: (id: string) => void
  onPlan: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <Panel title="Next gasoline experiment" description="Illustrative proposal. A chemist decides whether it enters the Testing Plan.">
      {recs.length === 0 ? (
        <EmptyNote title="No open gasoline proposals">Proposals that are rejected or already in the Testing Plan are listed under Next-Test Recommendations.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-5">
          {recs.map((r) => (
            <li key={r.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tnum text-xs font-medium text-muted-foreground">{r.id}</span>
                <StatusPill status={r.status} />
                <Pill tone="amber">Simulated</Pill>
                {r.modified ? <Pill tone="blue">Conditions modified</Pill> : null}
              </div>
              <h3 className="font-heading text-sm font-semibold text-ink">{r.title}</h3>
              <Dl className="grid-cols-2 lg:grid-cols-3">
                <KeyValue label="Additive">{additiveName(r.additiveType ?? r.formulationId)}</KeyValue>
                <KeyValue label="Booster dosage">
                  <Val v={r.dosagePpm} unit="ppm" />
                </KeyValue>
                <KeyValue label="Base blend">{r.blendId ?? 'Not specified'}</KeyValue>
              </Dl>
              <Dl className="sm:grid-cols-2">
                <KeyValue label="Why this test">{r.rationale}</KeyValue>
                <KeyValue label="Coverage gap">{r.coverageGap}</KeyValue>
                <KeyValue label="Value of the result">{r.value}</KeyValue>
                <KeyValue label="Limitations">{r.limitations}</KeyValue>
              </Dl>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="eyebrow">Evidence</span>
                {r.supportingExperimentIds.map((id) => (
                  <ExpLink key={id} id={id} />
                ))}
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <GatedButton allowed={canPlan} capability="plan:create" onClick={() => onPlan(r.id)}>
                  <ClipboardListIcon data-icon="inline-start" />
                  Add to testing plan
                </GatedButton>
                <GatedButton allowed={canDecide} capability="recommendation:decide" variant="outline" onClick={() => onModify(r.id)}>
                  <PencilIcon data-icon="inline-start" />
                  Modify
                </GatedButton>
                <GatedButton allowed={canDecide} capability="recommendation:decide" variant="ghost" onClick={() => onReject(r.id)}>
                  <XIcon data-icon="inline-start" />
                  Reject
                </GatedButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ------------------------- Specification validation checklist ------------------------- */

export type CheckStatus = 'Not Evaluated' | 'Planned' | 'Measured — Pending Review' | 'Reviewed'

export const CHECK_STATUSES: CheckStatus[] = ['Not Evaluated', 'Planned', 'Measured — Pending Review', 'Reviewed']

const CHECK_TONE: Record<CheckStatus, Tone> = {
  'Not Evaluated': 'slate',
  Planned: 'blue',
  'Measured — Pending Review': 'amber',
  Reviewed: 'teal',
}

export const SPEC_ITEMS: { id: string; name: string; detail: string }[] = [
  { id: 'mon', name: 'MON', detail: 'Motor Octane Number' },
  { id: 'rvp', name: 'RVP', detail: 'Reid Vapor Pressure' },
  { id: 'density', name: 'Density', detail: 'Density at reference temperature' },
  { id: 'd86', name: 'ASTM D86', detail: 'Distillation characteristics' },
  { id: 'sulfur', name: 'Sulfur', detail: 'Sulfur specifications' },
]

export function ChecklistPanel({
  blendLabel,
  statuses,
  canEdit,
  onChange,
  blendPicker,
}: {
  blendLabel: string
  statuses: Record<string, CheckStatus>
  canEdit: boolean
  onChange: (itemId: string, status: CheckStatus) => void
  blendPicker?: React.ReactNode
}) {
  return (
    <Panel
      title="Specification validation checklist"
      description={`Tracking for ${blendLabel}. A status records progress only; it is not a compliance result.`}
      action={blendPicker}
    >
      <div className="flex flex-col gap-4">
        <Notice tone="amber" title="No specification is confirmed here">
          Only RON is measured in the recorded data. Every other property remains unvalidated until a laboratory test result is recorded and reviewed by a chemist.
        </Notice>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-64">Update status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SPEC_ITEMS.map((item) => {
              const status = statuses[item.id] ?? 'Not Evaluated'
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.detail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Pill tone={CHECK_TONE[status]}>{status}</Pill>
                  </TableCell>
                  <TableCell>
                    <AppSelect
                      aria-label={`Status for ${item.name}`}
                      value={status}
                      disabled={!canEdit}
                      onChange={(v) => onChange(item.id, v as CheckStatus)}
                      options={CHECK_STATUSES.map((s) => ({ value: s, label: s }))}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!canEdit ? <p className="text-xs text-muted-foreground">Statuses can be updated by a Formulation Chemist or Laboratory Technician.</p> : null}
      </div>
    </Panel>
  )
}

'use client'

import { SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { WorkflowId } from '@/lib/types'
import { fmtDate } from '@/lib/format'
import { MultiSelect, type Option } from './pickers'

export interface Filters {
  q: string
  formulations: string[]
  samples: string[]
  statuses: string[]
  doseMin: string
  doseMax: string
  tempMin: string
  tempMax: string
  resMin: string
  resMax: string
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  formulations: [],
  samples: [],
  statuses: [],
  doseMin: '',
  doseMax: '',
  tempMin: '',
  tempMax: '',
  resMin: '',
  resMax: '',
  dateFrom: '',
  dateTo: '',
}

export const STATUS_OPTIONS: Option[] = ['Draft', 'Planned', 'Pending', 'In Progress', 'Under Review', 'Completed', 'Cancelled'].map((s) => ({ value: s, label: s }))

export interface FilterRow {
  id: string
  formulation: string
  sample: string
  dose: number | null
  temp: number | null
  settle: number | null
  result: number | null
  status: string
  date: string
}

function inRange(v: number | null, min: string, max: string): boolean {
  const lo = min.trim() === '' ? null : Number(min)
  const hi = max.trim() === '' ? null : Number(max)
  if (lo === null && hi === null) return true
  if (v === null) return false
  if (lo !== null && !Number.isNaN(lo) && v < lo) return false
  if (hi !== null && !Number.isNaN(hi) && v > hi) return false
  return true
}

export function applyFilters(rows: FilterRow[], f: Filters): FilterRow[] {
  const q = f.q.trim().toLowerCase()
  return rows.filter((r) => {
    if (q && !r.id.toLowerCase().includes(q)) return false
    if (f.formulations.length && !f.formulations.includes(r.formulation)) return false
    if (f.samples.length && !f.samples.includes(r.sample)) return false
    if (f.statuses.length && !f.statuses.includes(r.status)) return false
    if (!inRange(r.dose, f.doseMin, f.doseMax)) return false
    if (!inRange(r.temp, f.tempMin, f.tempMax)) return false
    if (!inRange(r.result, f.resMin, f.resMax)) return false
    if (f.dateFrom && r.date < f.dateFrom) return false
    if (f.dateTo && r.date > f.dateTo) return false
    return true
  })
}

export interface Chip {
  key: string
  label: string
  clear: Partial<Filters>
}

function rangeLabel(name: string, min: string, max: string, unit: string): string {
  if (min && max) return `${name}: ${min} to ${max} ${unit}`
  if (min) return `${name}: at least ${min} ${unit}`
  return `${name}: at most ${max} ${unit}`
}

export function buildChips(f: Filters, w: WorkflowId, nameOf: (id: string) => string): Chip[] {
  const chips: Chip[] = []
  if (f.q.trim()) chips.push({ key: 'q', label: `ID contains "${f.q.trim()}"`, clear: { q: '' } })
  for (const id of f.formulations) chips.push({ key: `f-${id}`, label: nameOf(id), clear: { formulations: f.formulations.filter((x) => x !== id) } })
  for (const id of f.samples) chips.push({ key: `s-${id}`, label: nameOf(id), clear: { samples: f.samples.filter((x) => x !== id) } })
  for (const s of f.statuses) chips.push({ key: `st-${s}`, label: s, clear: { statuses: f.statuses.filter((x) => x !== s) } })
  if (f.doseMin || f.doseMax) chips.push({ key: 'dose', label: rangeLabel('Dosage', f.doseMin, f.doseMax, 'ppm'), clear: { doseMin: '', doseMax: '' } })
  if (w === 'demulsifier' && (f.tempMin || f.tempMax)) chips.push({ key: 'temp', label: rangeLabel('Temperature', f.tempMin, f.tempMax, '°C'), clear: { tempMin: '', tempMax: '' } })
  if (f.resMin || f.resMax)
    chips.push({ key: 'res', label: rangeLabel(w === 'demulsifier' ? 'Water separation' : 'RON', f.resMin, f.resMax, w === 'demulsifier' ? '%' : ''), clear: { resMin: '', resMax: '' } })
  if (f.dateFrom || f.dateTo)
    chips.push({
      key: 'date',
      label: `Date: ${f.dateFrom ? fmtDate(f.dateFrom) : 'any'} to ${f.dateTo ? fmtDate(f.dateTo) : 'any'}`,
      clear: { dateFrom: '', dateTo: '' },
    })
  return chips
}

function RangeFields({
  legend,
  unit,
  min,
  max,
  onMin,
  onMax,
  idBase,
}: {
  legend: string
  unit: string
  min: string
  max: string
  onMin: (v: string) => void
  onMax: (v: string) => void
  idBase: string
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">
        {legend} {unit ? <span className="font-normal text-muted-foreground">({unit})</span> : null}
      </FieldLegend>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${idBase}-min`} className="text-xs text-muted-foreground">
            Minimum
          </FieldLabel>
          <Input id={`${idBase}-min`} type="number" inputMode="decimal" value={min} onChange={(e) => onMin(e.target.value)} className="tnum" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idBase}-max`} className="text-xs text-muted-foreground">
            Maximum
          </FieldLabel>
          <Input id={`${idBase}-max`} type="number" inputMode="decimal" value={max} onChange={(e) => onMax(e.target.value)} className="tnum" />
        </Field>
      </div>
    </FieldSet>
  )
}

export function FilterSheet({
  workflow,
  value,
  onChange,
  formulationOptions,
  sampleOptions,
  formulationLabel,
  sampleLabel,
  activeCount,
  resultCount,
}: {
  workflow: WorkflowId
  value: Filters
  onChange: (patch: Partial<Filters>) => void
  formulationOptions: Option[]
  sampleOptions: Option[]
  formulationLabel: string
  sampleLabel: string
  activeCount: number
  resultCount: number
}) {
  const dem = workflow === 'demulsifier'
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        All filters
        {activeCount > 0 ? <span className="tnum ml-0.5 rounded bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span> : null}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="font-heading">Filter experiments</SheetTitle>
          <SheetDescription>Filters apply as you change them. Records with no measured value are excluded while a range is set on that field.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <FieldGroup>
            <MultiSelect label={formulationLabel} options={formulationOptions} selected={value.formulations} onChange={(formulations) => onChange({ formulations })} />
            <MultiSelect label={sampleLabel} options={sampleOptions} selected={value.samples} onChange={(samples) => onChange({ samples })} />
            <MultiSelect label="Status" options={STATUS_OPTIONS} selected={value.statuses} onChange={(statuses) => onChange({ statuses })} />
            <RangeFields legend={dem ? 'Dosage' : 'Booster dosage'} unit="ppm" idBase="dose" min={value.doseMin} max={value.doseMax} onMin={(doseMin) => onChange({ doseMin })} onMax={(doseMax) => onChange({ doseMax })} />
            {dem ? (
              <RangeFields legend="Temperature" unit="°C" idBase="temp" min={value.tempMin} max={value.tempMax} onMin={(tempMin) => onChange({ tempMin })} onMax={(tempMax) => onChange({ tempMax })} />
            ) : null}
            <RangeFields legend={dem ? 'Water separation' : 'RON'} unit={dem ? '%' : ''} idBase="res" min={value.resMin} max={value.resMax} onMin={(resMin) => onChange({ resMin })} onMax={(resMax) => onChange({ resMax })} />
            <FieldSet>
              <FieldLegend variant="label">Experiment date</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="date-from" className="text-xs text-muted-foreground">
                    From
                  </FieldLabel>
                  <Input id="date-from" type="date" value={value.dateFrom} onChange={(e) => onChange({ dateFrom: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="date-to" className="text-xs text-muted-foreground">
                    To
                  </FieldLabel>
                  <Input id="date-to" type="date" value={value.dateTo} onChange={(e) => onChange({ dateTo: e.target.value })} />
                </Field>
              </div>
              <FieldDescription>Dates are inclusive.</FieldDescription>
            </FieldSet>
          </FieldGroup>
        </div>
        <SheetFooter className="border-t sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => onChange({ ...EMPTY_FILTERS })} disabled={activeCount === 0}>
            Clear all
          </Button>
          <p className="tnum self-center text-sm text-muted-foreground" aria-live="polite">
            {resultCount} matching
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

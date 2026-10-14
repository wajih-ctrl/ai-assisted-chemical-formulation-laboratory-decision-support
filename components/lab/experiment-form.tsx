'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ArrowLeftIcon, CheckCircle2Icon, CircleIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { TODAY_ISO, MIXING_DEFAULT } from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { BlendComponent, ExperimentStatus, WorkflowId } from '@/lib/types'
import { AppSelect, type Option } from './pickers'
import { EmptyNote, GatedButton, Notice, PageHeader, Panel } from './primitives'

const STATUS_OPTIONS: ExperimentStatus[] = ['Draft', 'Planned', 'Pending', 'In Progress', 'Under Review', 'Completed']
const MIXING_OPTIONS = [
  MIXING_DEFAULT,
  'Orbital shaker, 120 rpm, 10 min',
  'Hand shake, 100 strokes',
  'Overhead stirrer, 500 rpm, 3 min',
]
const RAG_OPTIONS = ['None observed', 'Thin rag layer (~1 mm)', 'Moderate rag layer (~3 mm)', 'Thick rag layer (~6 mm)']
const CLARITY_OPTIONS = ['Sharp', 'Moderately sharp', 'Diffuse', 'Poorly defined']
const RESULT_STATUSES: ExperimentStatus[] = ['Completed', 'Under Review']

const SECTIONS = [
  { id: 'identity', letter: 'A', label: 'Experiment identity' },
  { id: 'selection', letter: 'B', label: 'Chemical / blend selection' },
  { id: 'conditions', letter: 'C', label: 'Test conditions' },
  { id: 'results', letter: 'D', label: 'Experimental results' },
  { id: 'notes', letter: 'E', label: 'Notes' },
] as const

interface FormState {
  workflow: WorkflowId
  testDate: string
  technicianId: string
  status: ExperimentStatus
  formulationId: string
  crudeId: string
  sampleId: string
  dosage: string
  temp: string
  waterCut: string
  mixing: string
  settling: string
  waterSep: string
  bsw: string
  rag: string
  clarity: string
  blendId: string
  components: { name: string; pct: string }[]
  additiveType: string
  boosterPpm: string
  ron: string
  observations: string
  notes: string
}

type Errors = Record<string, string>

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))
const toNum = (s: string): number | null => (s.trim() === '' ? null : Number(s))

function checkRange(errors: Errors, key: string, raw: string, label: string, min: number, max: number, unit: string, required: boolean) {
  if (raw.trim() === '') {
    if (required) errors[key] = `${label} is required.`
    return
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) errors[key] = `${label} must be a number.`
  else if (n < min || n > max) errors[key] = `${label} must be between ${min} and ${max} ${unit}.`.replace(/ \.$/, '.')
}

export function ExperimentForm({ editId }: { editId?: string }) {
  const router = useRouter()
  const { state, actions } = useApp()
  const editing = editId ? state.experiments.find((e) => e.id === editId) ?? state.gasoline.find((e) => e.id === editId) : undefined
  const editingMissing = !!editId && !editing
  const canWrite = can(state.roleId, editId ? 'experiment:edit' : 'experiment:add')
  const capability = editId ? 'experiment:edit' : 'experiment:add'

  const technicians = useMemo(
    () => state.users.filter((u) => u.status === 'Active' && (u.role === 'technician' || u.role === 'chemist')),
    [state.users],
  )

  const initial = useMemo<FormState>(() => {
    const defaultTech = technicians.find((u) => u.id === state.userId)?.id ?? technicians.find((u) => u.role === 'technician')?.id ?? ''
    const base: FormState = {
      workflow: state.workflow,
      testDate: TODAY_ISO,
      technicianId: defaultTech,
      status: 'Planned',
      formulationId: '',
      crudeId: '',
      sampleId: '',
      dosage: '',
      temp: '',
      waterCut: '',
      mixing: MIXING_DEFAULT,
      settling: '',
      waterSep: '',
      bsw: '',
      rag: '',
      clarity: '',
      blendId: '',
      components: [],
      additiveType: '',
      boosterPpm: '',
      ron: '',
      observations: '',
      notes: '',
    }
    if (!editing) return base
    if (editing.workflow === 'demulsifier') {
      return {
        ...base,
        workflow: 'demulsifier',
        testDate: editing.testDate,
        technicianId: editing.technicianId,
        status: editing.status,
        formulationId: editing.formulationId,
        crudeId: editing.crudeId,
        sampleId: editing.sampleId,
        dosage: str(editing.dosagePpm),
        temp: str(editing.tempC),
        waterCut: str(editing.waterCutPct),
        mixing: editing.mixing,
        settling: str(editing.settlingMin),
        waterSep: str(editing.waterSepPct),
        bsw: str(editing.residualWaterPct),
        rag: editing.ragLayer ?? '',
        clarity: editing.clarity ?? '',
        observations: editing.observations,
        notes: editing.notes,
      }
    }
    return {
      ...base,
      workflow: 'gasoline',
      testDate: editing.testDate,
      technicianId: editing.technicianId,
      status: editing.status,
      blendId: editing.blendId,
      components: editing.components.map((c) => ({ name: c.name, pct: String(c.pct) })),
      additiveType: editing.additiveType,
      boosterPpm: str(editing.boosterPpm),
      ron: str(editing.ron),
      observations: editing.observations,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id])

  const [f, setF] = useState<FormState>(initial)
  const [showErrors, setShowErrors] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }))

  const isGas = f.workflow === 'gasoline'
  const previewId = editId ?? (isGas ? actions.nextGasId() : actions.nextDemId())
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)

  const demFormulations = state.formulations.filter((x) => {
    const cat = state.categories.find((c) => c.id === x.categoryId)
    return cat?.workflow === 'demulsifier'
  })
  const gasAdditives = state.formulations.filter((x) => state.categories.find((c) => c.id === x.categoryId)?.workflow === 'gasoline')
  const formulation = state.formulations.find((x) => x.id === f.formulationId)
  const category = state.categories.find((c) => c.id === formulation?.categoryId)

  const total = f.components.reduce((s, c) => s + (Number.isFinite(Number(c.pct)) ? Number(c.pct) : 0), 0)
  const totalOk = Math.abs(total - 100) < 0.05

  const options = {
    technicians: technicians.map<Option>((u) => ({ value: u.id, label: `${u.name} (${u.role === 'chemist' ? 'Chemist' : 'Technician'})` })),
    status: STATUS_OPTIONS.map<Option>((s) => ({ value: s, label: s })),
    formulations: demFormulations.map<Option>((x) => ({ value: x.id, label: `${x.id}: ${x.name}` })),
    crudes: state.crudes.map<Option>((c) => ({ value: c.id, label: `${c.id}: ${c.name}` })),
    blends: state.blends.map<Option>((b) => ({ value: b.id, label: `${b.id}: ${b.name}` })),
    additives: gasAdditives.map<Option>((x) => ({ value: x.id, label: `${x.id}: ${x.name}` })),
    mixing: (MIXING_OPTIONS.includes(f.mixing) || !f.mixing ? MIXING_OPTIONS : [f.mixing, ...MIXING_OPTIONS]).map<Option>((m) => ({ value: m, label: m })),
    rag: [{ value: 'unset', label: 'Not recorded' }, ...RAG_OPTIONS.map<Option>((m) => ({ value: m, label: m }))],
    clarity: [{ value: 'unset', label: 'Not recorded' }, ...CLARITY_OPTIONS.map<Option>((m) => ({ value: m, label: m }))],
  }

  function validate(mode: 'draft' | 'save'): Errors {
    const e: Errors = {}
    const full = mode === 'save'
    if (!f.testDate) e.testDate = 'Test date is required.'
    if (!f.technicianId) e.technicianId = 'Select a technician.'
    if (!isGas) {
      if (!f.formulationId) e.formulationId = 'Select a formulation.'
      if (!f.crudeId) e.crudeId = 'Select a crude source.'
      checkRange(e, 'dosage', f.dosage, 'Dosage', 1, 2000, 'ppm', full)
      checkRange(e, 'temp', f.temp, 'Temperature', 0, 150, '°C', full)
      checkRange(e, 'waterCut', f.waterCut, 'Water cut', 0, 100, '%', false)
      checkRange(e, 'settling', f.settling, 'Settling time', 1, 1440, 'min', full)
      const needsResult = full && RESULT_STATUSES.includes(f.status)
      checkRange(e, 'waterSep', f.waterSep, 'Water separation', 0, 100, '%', needsResult)
      checkRange(e, 'bsw', f.bsw, 'Residual water (BS&W)', 0, 100, '%', false)
    } else {
      if (!f.blendId) e.blendId = 'Select a blend family.'
      if (!f.additiveType) e.additiveType = 'Select a booster / additive.'
      if (f.components.length === 0) e.components = 'Add at least one blend component.'
      else if (f.components.some((c) => !c.name.trim())) e.components = 'Every component needs a name.'
      else if (f.components.some((c) => !Number.isFinite(Number(c.pct)) || Number(c.pct) < 0 || Number(c.pct) > 100)) e.components = 'Each proportion must be between 0 and 100 vol%.'
      else if (total > 100.05) e.components = `Proportions total ${total.toFixed(1)} vol%. They must not exceed 100.`
      else if (full && !totalOk) e.components = `Proportions total ${total.toFixed(1)} vol%. They must total 100 to save the experiment.`
      checkRange(e, 'boosterPpm', f.boosterPpm, 'Booster dosage', 0, 2000, 'ppm', full)
      const needsRon = full && RESULT_STATUSES.includes(f.status)
      checkRange(e, 'ron', f.ron, 'Measured RON', 80, 110, '', needsRon)
    }
    return e
  }

  const errors = showErrors ? validate('save') : {}
  const liveErr = (key: string) => (showErrors ? errors[key] : undefined)

  const completion = {
    identity: !!f.testDate && !!f.technicianId,
    selection: isGas ? !!f.blendId && !!f.additiveType && f.components.length > 0 && totalOk : !!f.formulationId && !!f.crudeId,
    conditions: isGas ? f.boosterPpm.trim() !== '' : f.dosage.trim() !== '' && f.temp.trim() !== '' && f.settling.trim() !== '',
    results: isGas ? f.ron.trim() !== '' : f.waterSep.trim() !== '',
    notes: f.observations.trim() !== '' || f.notes.trim() !== '',
  }

  function persist(mode: 'draft' | 'save') {
    const errs = validate(mode)
    if (Object.keys(errs).length > 0) {
      setShowErrors(true)
      toast.error(`Fix ${Object.keys(errs).length} highlighted ${Object.keys(errs).length === 1 ? 'field' : 'fields'} before saving`)
      const first = SECTIONS.find((s) => Object.keys(errs).some((k) => sectionOf(k) === s.id))
      if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    let status = f.status
    if (mode === 'draft') status = 'Draft'
    else if (status === 'Draft') status = (isGas ? f.ron.trim() : f.waterSep.trim()) !== '' ? 'Completed' : 'Planned'

    let id = editId ?? ''
    if (!isGas) {
      const crude = state.crudes.find((c) => c.id === f.crudeId)
      const patch = {
        testDate: f.testDate,
        technicianId: f.technicianId,
        status,
        formulationId: f.formulationId,
        crudeId: f.crudeId,
        sampleId: f.sampleId.trim() || crude?.sampleId || '',
        dosagePpm: toNum(f.dosage),
        tempC: toNum(f.temp),
        waterCutPct: toNum(f.waterCut),
        mixing: f.mixing,
        settlingMin: toNum(f.settling),
        waterSepPct: toNum(f.waterSep),
        residualWaterPct: toNum(f.bsw),
        ragLayer: f.rag || null,
        clarity: f.clarity || null,
        observations: f.observations.trim() || (toNum(f.waterSep) === null ? 'No results recorded yet.' : ''),
        notes: f.notes.trim(),
      }
      if (editId) actions.updateExperiment(editId, patch)
      else
        id = actions.addExperiment({ ...patch, workflow: 'demulsifier', datasetId: 'DS-001', source: 'manual' })
    } else {
      const patch = {
        testDate: f.testDate,
        technicianId: f.technicianId,
        status,
        blendId: f.blendId,
        components: f.components.map<BlendComponent>((c) => ({ name: c.name.trim(), pct: Number(c.pct) })),
        additiveType: f.additiveType,
        boosterPpm: toNum(f.boosterPpm),
        ron: toNum(f.ron),
        observations: f.observations.trim() || (toNum(f.ron) === null ? 'No results recorded yet.' : ''),
      }
      if (editId) actions.updateGasoline(editId, patch)
      else id = actions.addGasoline({ ...patch, workflow: 'gasoline', datasetId: 'DS-003', source: 'manual' })
    }
    toast.success(editId ? `${id} updated` : mode === 'draft' ? `${id} saved as a draft` : `${id} saved`, {
      description: mode === 'draft' ? 'Incomplete results are fine for a draft. Finish the record any time.' : undefined,
    })
    router.push(`/experiments/${id}`)
  }

  function chooseWorkflow(w: WorkflowId) {
    if (editId || w === f.workflow) return
    set({ workflow: w })
    actions.setWorkflow(w)
    setShowErrors(false)
  }

  function chooseCrude(id: string) {
    const crude = state.crudes.find((c) => c.id === id)
    set({ crudeId: id, sampleId: crude?.sampleId ?? '', waterCut: crude ? String(crude.waterCutPct) : f.waterCut })
  }

  function chooseBlend(id: string) {
    const blend = state.blends.find((b) => b.id === id)
    set({ blendId: id, components: blend ? blend.components.map((c) => ({ name: c.name, pct: String(c.pct) })) : f.components })
  }

  function updateComponent(i: number, patch: Partial<{ name: string; pct: string }>) {
    set({ components: f.components.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
  }

  if (editingMissing) {
    return (
      <>
        <PageHeader eyebrow="Edit experiment" title={`No record named ${editId}`} />
        <EmptyNote title="Experiment not found" action={<Button render={<Link href="/experiments" />}>Back to experiments</Button>}>
          It may have been removed, or the identifier in the address is incorrect.
        </EmptyNote>
      </>
    )
  }

  const cancelHref = editId ? `/experiments/${editId}` : '/experiments'

  return (
    <>
      <PageHeader
        eyebrow={editId ? 'Edit experiment' : 'New experiment'}
        title={editId ? `Edit ${editId}` : 'Add experiment'}
        description="Record a bottle test or blend screening. Only the highlighted required fields are needed to save; results can stay blank and a draft can be saved at any point. Blank measurements are stored as not measured, never as zero."
        actions={
          <Button variant="ghost" render={<Link href={cancelHref} />}>
            <ArrowLeftIcon data-icon="inline-start" />
            {editId ? 'Back to record' : 'Experiments'}
          </Button>
        }
      />

      {!canWrite ? (
        <Notice tone="amber" title="View only for your role" className="mb-4">
          {editId ? 'Editing' : 'Adding'} experiments is available to Formulation Chemists and Laboratory Technicians. You can look around the form, but saving is disabled.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Form sections" className="print-hidden hidden lg:block">
          <ol className="sticky top-20 flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const done = completion[s.id]
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(ev) => {
                      ev.preventDefault()
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {done ? <CheckCircle2Icon className="size-4 shrink-0 text-primary" aria-label="Complete" /> : <CircleIcon className="size-4 shrink-0 text-subtle" aria-label="Not yet complete" />}
                    <span className="min-w-0 truncate">
                      <span className="tnum mr-1 text-xs text-subtle">{s.letter}</span>
                      {isGas && s.id === 'selection' ? 'Blend selection' : s.label}
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>

        <form
          className="flex min-w-0 flex-col gap-5"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault()
            persist('save')
          }}
        >
          <Panel id="identity" title="A. Experiment identity" description="Who ran it, when, and where it stands.">
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Experiment ID</FieldLabel>
                <div className="tnum flex h-11 items-center rounded-xl border bg-muted px-3.5 text-sm font-medium text-ink">{previewId}</div>
                <FieldDescription>Generated automatically. IDs are never reused.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Experiment workflow</FieldLabel>
                <div role="group" aria-label="Experiment workflow" className="flex gap-2">
                  {(
                    [
                      ['demulsifier', 'Demulsifier bottle test'],
                      ['gasoline', 'Gasoline blending'],
                    ] as const
                  ).map(([w, label]) => (
                    <Button
                      key={w}
                      type="button"
                      variant={f.workflow === w ? 'default' : 'outline'}
                      aria-pressed={f.workflow === w}
                      disabled={!!editId && f.workflow !== w}
                      onClick={() => chooseWorkflow(w)}
                      className="flex-1"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <FieldDescription>{editId ? 'The workflow of an existing record cannot be changed.' : 'Switching replaces the fields below.'}</FieldDescription>
              </Field>
              <Field data-invalid={!!liveErr('testDate') || undefined}>
                <FieldLabel htmlFor="testDate">
                  Test date <Req />
                </FieldLabel>
                <Input id="testDate" type="date" required value={f.testDate} onChange={(ev) => set({ testDate: ev.target.value })} aria-invalid={!!liveErr('testDate')} aria-describedby={liveErr('testDate') ? 'testDate-error' : undefined} />
                <FieldError id="testDate-error">{liveErr('testDate')}</FieldError>
              </Field>
              <Field data-invalid={!!liveErr('technicianId') || undefined}>
                <FieldLabel htmlFor="technician">
                  Technician <Req />
                </FieldLabel>
                <AppSelect id="technician" value={f.technicianId} onChange={(v) => set({ technicianId: v })} options={options.technicians} placeholder="Select technician" aria-required aria-invalid={!!liveErr('technicianId')} aria-describedby={liveErr('technicianId') ? 'technician-error' : undefined} />
                <FieldError id="technician-error">{liveErr('technicianId')}</FieldError>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="status">Experiment status</FieldLabel>
                <AppSelect id="status" value={f.status} onChange={(v) => set({ status: v as ExperimentStatus })} options={options.status} />
                <FieldDescription>
                  {RESULT_STATUSES.includes(f.status)
                    ? `${isGas ? 'A measured RON' : 'Water separation'} is required for ${f.status} records.`
                    : f.status === 'Draft'
                      ? 'Saving the experiment (not the draft) moves it to Planned, or Completed when results are entered.'
                      : 'Results can be added later from the experiment record.'}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </Panel>

          {!isGas ? (
            <>
              <Panel id="selection" title="B. Chemical selection" description="The formulation under test and the crude it was tested on.">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={!!liveErr('formulationId') || undefined}>
                    <FieldLabel htmlFor="formulation">
                      Formulation ID <Req />
                    </FieldLabel>
                    <AppSelect id="formulation" value={f.formulationId} onChange={(v) => set({ formulationId: v })} options={options.formulations} placeholder="Select formulation" aria-required aria-invalid={!!liveErr('formulationId')} aria-describedby={liveErr('formulationId') ? 'formulation-error' : undefined} />
                    <FieldError id="formulation-error">{liveErr('formulationId')}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel>Chemical category</FieldLabel>
                    <div className="flex h-11 items-center rounded-xl border bg-muted px-3.5 text-sm text-ink">
                      {category ? category.name : <span className="text-subtle">Set by the formulation</span>}
                    </div>
                  </Field>
                  <Field data-invalid={!!liveErr('crudeId') || undefined}>
                    <FieldLabel htmlFor="crude">
                      Crude source <Req />
                    </FieldLabel>
                    <AppSelect id="crude" value={f.crudeId} onChange={chooseCrude} options={options.crudes} placeholder="Select crude" aria-required aria-invalid={!!liveErr('crudeId')} aria-describedby={liveErr('crudeId') ? 'crude-error' : undefined} />
                    <FieldError id="crude-error">{liveErr('crudeId')}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="sampleId">Sample ID</FieldLabel>
                    <Input id="sampleId" value={f.sampleId} onChange={(ev) => set({ sampleId: ev.target.value })} placeholder="Filled from the crude, editable" />
                  </Field>
                </FieldGroup>
              </Panel>

              <Panel id="conditions" title="C. Test conditions" description="Conditions must match for results to be comparable.">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <NumField id="dosage" label="Dosage" unit="ppm" required value={f.dosage} onChange={(v) => set({ dosage: v })} error={liveErr('dosage')} hint="1 to 2000 ppm" />
                  <NumField id="temp" label="Temperature" unit="°C" required value={f.temp} onChange={(v) => set({ temp: v })} error={liveErr('temp')} hint="0 to 150 °C" />
                  <NumField id="waterCut" label="Water cut" unit="%" value={f.waterCut} onChange={(v) => set({ waterCut: v })} error={liveErr('waterCut')} hint="Prefilled from the crude sample" />
                  <NumField id="settling" label="Settling time" unit="min" required value={f.settling} onChange={(v) => set({ settling: v })} error={liveErr('settling')} hint="1 to 1440 min" />
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="mixing">Mixing conditions</FieldLabel>
                    <AppSelect id="mixing" value={f.mixing} onChange={(v) => set({ mixing: v })} options={options.mixing} />
                  </Field>
                </FieldGroup>
              </Panel>

              <Panel id="results" title="D. Experimental results" description="Optional. Leave anything unmeasured blank.">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <NumField id="waterSep" label="Water separation" unit="%" required={RESULT_STATUSES.includes(f.status)} value={f.waterSep} onChange={(v) => set({ waterSep: v })} error={liveErr('waterSep')} hint="0 to 100 %" />
                  <NumField id="bsw" label="Residual water (BS&W)" unit="%" value={f.bsw} onChange={(v) => set({ bsw: v })} error={liveErr('bsw')} hint="0 to 100 %" />
                  <Field>
                    <FieldLabel htmlFor="rag">Rag-layer observation</FieldLabel>
                    <AppSelect id="rag" value={f.rag || 'unset'} onChange={(v) => set({ rag: v === 'unset' ? '' : v })} options={options.rag} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="clarity">Interface clarity</FieldLabel>
                    <AppSelect id="clarity" value={f.clarity || 'unset'} onChange={(v) => set({ clarity: v === 'unset' ? '' : v })} options={options.clarity} />
                  </Field>
                </FieldGroup>
              </Panel>
            </>
          ) : (
            <>
              <Panel id="selection" title="B. Blend selection" description="Choose a blend family, then adjust its component proportions if this run differed.">
                <FieldGroup className="gap-4">
                  <Field data-invalid={!!liveErr('blendId') || undefined}>
                    <FieldLabel htmlFor="blend">
                      Blend ID <Req />
                    </FieldLabel>
                    <AppSelect id="blend" value={f.blendId} onChange={chooseBlend} options={options.blends} placeholder="Select blend family" aria-required aria-invalid={!!liveErr('blendId')} aria-describedby={liveErr('blendId') ? 'blend-error' : undefined} />
                    <FieldDescription>Choosing a blend loads its standard component proportions.</FieldDescription>
                    <FieldError id="blend-error">{liveErr('blendId')}</FieldError>
                  </Field>

                  <div className="flex flex-col gap-3" role="group" aria-labelledby="components-label">
                    <div className="flex items-center justify-between gap-3">
                      <p id="components-label" className="text-sm font-medium text-ink">
                        Base blend components <Req />
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={() => set({ components: [...f.components, { name: '', pct: '' }] })}>
                        <PlusIcon data-icon="inline-start" />
                        Add component
                      </Button>
                    </div>
                    {f.components.length === 0 ? (
                      <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-4 text-sm text-muted-foreground">Select a blend family to load components, or add them manually.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {f.components.map((c, i) => (
                          <li key={i} className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                            <Input aria-label={`Component ${i + 1} name`} value={c.name} placeholder="Component name" onChange={(ev) => updateComponent(i, { name: ev.target.value })} />
                            <InputGroup>
                              <InputGroupInput aria-label={`Component ${i + 1} proportion`} inputMode="decimal" value={c.pct} placeholder="0" onChange={(ev) => updateComponent(i, { pct: ev.target.value })} className="tnum" />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>vol%</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                            <Button type="button" size="icon" variant="ghost" aria-label={`Remove component ${i + 1}`} onClick={() => set({ components: f.components.filter((_, idx) => idx !== i) })}>
                              <Trash2Icon />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-col gap-1.5" aria-live="polite">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total proportion</span>
                        <span className={cn('tnum font-semibold', totalOk ? 'text-success-ink' : total > 100.05 ? 'text-destructive' : 'text-amber-ink')}>{total.toFixed(1)} / 100 vol%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(total, 100)} aria-label="Blend proportion total">
                        <div className={cn('h-full rounded-full transition-all', totalOk ? 'bg-teal' : total > 100.05 ? 'bg-destructive' : 'bg-amber')} style={{ width: `${Math.min(total, 100)}%` }} />
                      </div>
                      {liveErr('components') ? (
                        <p role="alert" className="text-sm text-destructive">
                          {liveErr('components')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </FieldGroup>
              </Panel>

              <Panel id="conditions" title="C. Additive and dosage" description="The booster added to the base blend.">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field data-invalid={!!liveErr('additiveType') || undefined}>
                    <FieldLabel htmlFor="additive">
                      Booster / additive type <Req />
                    </FieldLabel>
                    <AppSelect id="additive" value={f.additiveType} onChange={(v) => set({ additiveType: v })} options={options.additives} placeholder="Select additive" aria-required aria-invalid={!!liveErr('additiveType')} aria-describedby={liveErr('additiveType') ? 'additive-error' : undefined} />
                    <FieldError id="additive-error">{liveErr('additiveType')}</FieldError>
                  </Field>
                  <NumField id="boosterPpm" label="Booster dosage" unit="ppm" required value={f.boosterPpm} onChange={(v) => set({ boosterPpm: v })} error={liveErr('boosterPpm')} hint="Use 0 for the un-dosed baseline" />
                </FieldGroup>
              </Panel>

              <Panel id="results" title="D. Experimental results" description="Optional until the record is completed.">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <NumField id="ron" label="Measured RON" required={RESULT_STATUSES.includes(f.status)} value={f.ron} onChange={(v) => set({ ron: v })} error={liveErr('ron')} hint="80 to 110" />
                </FieldGroup>
              </Panel>
            </>
          )}

          <Panel id="notes-section" title="E. Notes" description="Anything the next reader should know.">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="observations">Laboratory observations</FieldLabel>
                <Textarea id="observations" rows={3} value={f.observations} onChange={(ev) => set({ observations: ev.target.value })} placeholder="Interface appearance, timing of water drop, anything unusual" />
              </Field>
              {!isGas ? (
                <Field>
                  <FieldLabel htmlFor="notes">Additional notes</FieldLabel>
                  <Textarea id="notes" rows={2} value={f.notes} onChange={(ev) => set({ notes: ev.target.value })} placeholder="Sample handling, deviations from method, follow-up ideas" />
                </Field>
              ) : null}
            </FieldGroup>
          </Panel>

          <div className="print-hidden sticky bottom-3 z-20 rounded-xl border bg-card/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {Object.values(completion).filter(Boolean).length} of {SECTIONS.length} sections complete
                {dirty ? ' · unsaved changes' : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" render={<Link href={cancelHref} />}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!dirty}
                  onClick={() => (dirty ? setResetOpen(true) : undefined)}
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  Reset
                </Button>
                <GatedButton allowed={canWrite} capability={capability} variant="outline" onClick={() => persist('draft')}>
                  {editId ? 'Save as draft' : 'Save draft'}
                </GatedButton>
                <GatedButton allowed={canWrite} capability={capability} type="submit">
                  {editId ? 'Save changes' : 'Save experiment'}
                </GatedButton>
              </div>
            </div>
          </div>
        </form>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this form?</AlertDialogTitle>
            <AlertDialogDescription>
              {editId ? `Your edits will be discarded and the recorded values for ${editId} restored.` : 'Everything you have entered will be cleared.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setF(initial)
                setShowErrors(false)
                toast.message('Form reset')
              }}
            >
              Reset form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function sectionOf(key: string): string {
  if (key === 'testDate' || key === 'technicianId') return 'identity'
  if (['formulationId', 'crudeId', 'blendId', 'components'].includes(key)) return 'selection'
  if (['dosage', 'temp', 'waterCut', 'settling', 'additiveType', 'boosterPpm'].includes(key)) return 'conditions'
  return 'results'
}

function Req() {
  return (
    <span className="text-destructive" aria-hidden>
      *<span className="sr-only"> required</span>
    </span>
  )
}

function NumField({
  id,
  label,
  unit,
  required,
  value,
  onChange,
  error,
  hint,
}: {
  id: string
  label: string
  unit?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: ReactNode
}) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>
        {label} {required ? <Req /> : <span className="text-xs font-normal text-subtle">(optional)</span>}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput id={id} inputMode="decimal" required={required} value={value} onChange={(ev) => onChange(ev.target.value)} aria-invalid={!!error} aria-describedby={`${id}-message`} className="tnum" placeholder="Not measured" />
        {unit ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? <FieldError id={`${id}-message`}>{error}</FieldError> : hint ? <FieldDescription id={`${id}-message`}>{hint}</FieldDescription> : null}
    </Field>
  )
}

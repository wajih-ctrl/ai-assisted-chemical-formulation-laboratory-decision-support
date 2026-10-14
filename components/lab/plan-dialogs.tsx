'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { UserXIcon } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useApp } from '@/lib/store'
import { TODAY_ISO } from '@/lib/seed'
import { ROLE_LABEL } from '@/lib/roles'
import { initials, uniqueSorted } from '@/lib/format'
import type { TestingPlanItem, User, WorkflowId } from '@/lib/types'
import { AppSelect } from './pickers'
import { ExpLink, Val } from './primitives'

function numOrNull(v: string): number | null {
  const n = Number(v)
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

export function TechnicianRow({ user, className }: { user: User; className?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className ?? ''}`}>
      <Avatar className="size-7">
        <AvatarFallback className="bg-teal-soft text-[11px] font-semibold text-teal-ink">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate text-sm font-medium text-ink">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
      </span>
    </span>
  )
}

export function AssignDialog({ item, onClose }: { item: TestingPlanItem | null; onClose: () => void }) {
  const { state, actions } = useApp()
  const candidates = state.users.filter((u) => (u.role === 'technician' || u.role === 'chemist') && u.status === 'Active')
  const current = item?.assigneeId ? state.users.find((u) => u.id === item.assigneeId) : undefined

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current ? 'Reassign technician' : 'Assign technician'}</DialogTitle>
          <DialogDescription>{item ? `${item.id} · ${item.title}` : ''}</DialogDescription>
        </DialogHeader>
        {current ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
            <TechnicianRow user={current} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!item) return
                actions.assignPlan(item.id, null)
                toast(`Technician removed from ${item.id}`)
                onClose()
              }}
            >
              <UserXIcon data-icon="inline-start" />
              Remove
            </Button>
          </div>
        ) : null}
        <Command className="border">
          <CommandInput placeholder="Search by name or role" />
          <CommandList>
            <CommandEmpty>No matching technician.</CommandEmpty>
            <CommandGroup heading="Available">
              {candidates.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.name} ${ROLE_LABEL[u.role]}`}
                  data-checked={u.id === item?.assigneeId}
                  onSelect={() => {
                    if (!item) return
                    actions.assignPlan(item.id, u.id)
                    toast.success(`${u.name} assigned to ${item.id}`)
                    onClose()
                  }}
                >
                  <TechnicianRow user={u} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function useCatalog(workflow: WorkflowId) {
  const { state } = useApp()
  return useMemo(() => {
    const isGas = workflow === 'gasoline'
    const formulations = state.formulations.filter((f) => (isGas ? f.id.startsWith('ADD-') : !f.id.startsWith('ADD-')))
    return { isGas, formulations, crudes: state.crudes, blends: state.blends }
  }, [state.formulations, state.crudes, state.blends, workflow])
}

interface DraftFields {
  title: string
  formulationId: string
  crudeId: string
  blendId: string
  dosage: string
  temp: string
  settling: string
  date: string
  notes: string
}

function PlanFields({ draft, setDraft, workflow }: { draft: DraftFields; setDraft: (d: DraftFields) => void; workflow: WorkflowId }) {
  const { isGas, formulations, crudes, blends } = useCatalog(workflow)
  const set = (patch: Partial<DraftFields>) => setDraft({ ...draft, ...patch })
  const dosageNum = numOrNull(draft.dosage)
  const dosageInvalid = dosageNum === null || dosageNum <= 0
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="plan-title">Proposed experiment</FieldLabel>
        <Input id="plan-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Short description of the test" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="plan-form">{isGas ? 'Additive' : 'Formulation'}</FieldLabel>
          <AppSelect id="plan-form" value={draft.formulationId} onChange={(v) => set({ formulationId: v })} options={formulations.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />
        </Field>
        {isGas ? (
          <Field>
            <FieldLabel htmlFor="plan-blend">Base blend</FieldLabel>
            <AppSelect id="plan-blend" value={draft.blendId} onChange={(v) => set({ blendId: v })} options={blends.map((b) => ({ value: b.id, label: `${b.id} · ${b.name}` }))} />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="plan-crude">Crude sample</FieldLabel>
            <AppSelect id="plan-crude" value={draft.crudeId} onChange={(v) => set({ crudeId: v })} options={crudes.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }))} />
          </Field>
        )}
      </div>
      <div className={`grid gap-4 ${isGas ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        <Field data-invalid={dosageInvalid || undefined}>
          <FieldLabel htmlFor="plan-dose">Dosage (ppm)</FieldLabel>
          <Input id="plan-dose" inputMode="decimal" value={draft.dosage} onChange={(e) => set({ dosage: e.target.value })} aria-invalid={dosageInvalid} />
        </Field>
        {!isGas ? (
          <>
            <Field>
              <FieldLabel htmlFor="plan-temp">Temperature (°C)</FieldLabel>
              <Input id="plan-temp" inputMode="decimal" value={draft.temp} onChange={(e) => set({ temp: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-settle">Settling (min)</FieldLabel>
              <Input id="plan-settle" inputMode="decimal" value={draft.settling} onChange={(e) => set({ settling: e.target.value })} />
            </Field>
          </>
        ) : null}
        <Field>
          <FieldLabel htmlFor="plan-date">Planned date</FieldLabel>
          <Input id="plan-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="plan-notes">Notes</FieldLabel>
        <Textarea id="plan-notes" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </FieldGroup>
  )
}

function validDraft(d: DraftFields): boolean {
  const n = numOrNull(d.dosage)
  return d.title.trim().length > 0 && n !== null && n > 0 && !!d.date && !!d.formulationId
}

export function EditPlanDialog({ item, onClose }: { item: TestingPlanItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">{item ? <EditForm key={item.id} item={item} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function EditForm({ item, onClose }: { item: TestingPlanItem; onClose: () => void }) {
  const { actions } = useApp()
  const [draft, setDraft] = useState<DraftFields>({
    title: item.title,
    formulationId: item.formulationId,
    crudeId: item.crudeId,
    blendId: item.blendId ?? '',
    dosage: String(item.dosagePpm),
    temp: item.tempC === null ? '' : String(item.tempC),
    settling: item.settlingMin === null ? '' : String(item.settlingMin),
    date: item.plannedDate,
    notes: item.notes,
  })
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit planned test {item.id}</DialogTitle>
        <DialogDescription>Changes also update the linked experiment while it has not been completed.</DialogDescription>
      </DialogHeader>
      <PlanFields draft={draft} setDraft={setDraft} workflow={item.workflow} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!validDraft(draft)}
          onClick={() => {
            actions.updatePlanItem(item.id, {
              title: draft.title.trim(),
              formulationId: draft.formulationId,
              crudeId: draft.crudeId,
              blendId: draft.blendId || undefined,
              dosagePpm: numOrNull(draft.dosage) ?? item.dosagePpm,
              tempC: numOrNull(draft.temp),
              settlingMin: numOrNull(draft.settling),
              plannedDate: draft.date,
              notes: draft.notes,
            })
            toast.success(`${item.id} updated`)
            onClose()
          }}
        >
          Save changes
        </Button>
      </DialogFooter>
    </>
  )
}

export function AddPlanDialog({ open, workflow, onClose }: { open: boolean; workflow: WorkflowId; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">{open ? <AddForm workflow={workflow} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function AddForm({ workflow, onClose }: { workflow: WorkflowId; onClose: () => void }) {
  const { state, actions } = useApp()
  const { isGas, formulations } = useCatalog(workflow)
  const [draft, setDraft] = useState<DraftFields>({
    title: '',
    formulationId: formulations[0]?.id ?? '',
    crudeId: state.crudes[0]?.id ?? '',
    blendId: state.blends[0]?.id ?? '',
    dosage: '',
    temp: isGas ? '' : '60',
    settling: isGas ? '' : '30',
    date: TODAY_ISO,
    notes: '',
  })
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add planned experiment</DialogTitle>
        <DialogDescription>The test starts as Proposed and needs chemist approval before it can be scheduled.</DialogDescription>
      </DialogHeader>
      <PlanFields draft={draft} setDraft={setDraft} workflow={workflow} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!validDraft(draft)}
          onClick={() => {
            const id = actions.addPlanItem({
              workflow,
              title: draft.title.trim(),
              formulationId: draft.formulationId,
              crudeId: isGas ? '' : draft.crudeId,
              blendId: isGas ? draft.blendId : undefined,
              dosagePpm: numOrNull(draft.dosage) ?? 0,
              tempC: numOrNull(draft.temp),
              settlingMin: numOrNull(draft.settling),
              assigneeId: null,
              plannedDate: draft.date,
              status: 'Proposed',
              supportingExperimentIds: [],
              notes: draft.notes,
            })
            toast.success(`${id} added to the testing plan`)
            onClose()
          }}
        >
          Add to plan
        </Button>
      </DialogFooter>
    </>
  )
}

export function ResultsDialog({ item, onClose }: { item: TestingPlanItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">{item ? <ResultsForm key={item.id} item={item} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function ResultsForm({ item, onClose }: { item: TestingPlanItem; onClose: () => void }) {
  const { state, actions } = useApp()
  const isGas = item.workflow === 'gasoline'
  const rags = useMemo(() => uniqueSorted(state.experiments.map((e) => e.ragLayer).filter((x): x is string => !!x)), [state.experiments])
  const clarities = useMemo(() => uniqueSorted(state.experiments.map((e) => e.clarity).filter((x): x is string => !!x)), [state.experiments])
  const [water, setWater] = useState('')
  const [residual, setResidual] = useState('')
  const [ron, setRon] = useState('')
  const [rag, setRag] = useState('')
  const [clarity, setClarity] = useState('')
  const [observations, setObservations] = useState('')
  const [notes, setNotes] = useState('')
  const [complete, setComplete] = useState(true)

  const waterNum = numOrNull(water)
  const residualNum = numOrNull(residual)
  const waterInvalid = water.trim() !== '' && (waterNum === null || waterNum < 0 || waterNum > 100)
  const residualInvalid = residual.trim() !== '' && (residualNum === null || residualNum < 0 || residualNum > 100)
  const ronNum = numOrNull(ron)
  const hasValue = isGas ? ronNum !== null : waterNum !== null
  const canSave = hasValue && !waterInvalid && !residualInvalid

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enter results for {item.id}</DialogTitle>
        <DialogDescription>
          Recorded values create or update the linked experiment record. Leave a measurement empty when it was not taken; it is never stored as zero.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        {isGas ? (
          <Field>
            <FieldLabel htmlFor="res-ron">Research octane number (RON)</FieldLabel>
            <Input id="res-ron" inputMode="decimal" value={ron} onChange={(e) => setRon(e.target.value)} />
          </Field>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={waterInvalid || undefined}>
                <FieldLabel htmlFor="res-water">Water separation (%)</FieldLabel>
                <Input id="res-water" inputMode="decimal" value={water} onChange={(e) => setWater(e.target.value)} aria-invalid={waterInvalid} />
                {waterInvalid ? <FieldDescription>Enter a value between 0 and 100.</FieldDescription> : null}
              </Field>
              <Field data-invalid={residualInvalid || undefined}>
                <FieldLabel htmlFor="res-resid">Residual water (%)</FieldLabel>
                <Input id="res-resid" inputMode="decimal" value={residual} onChange={(e) => setResidual(e.target.value)} aria-invalid={residualInvalid} />
                {residualInvalid ? <FieldDescription>Enter a value between 0 and 100.</FieldDescription> : null}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="res-rag">Rag layer</FieldLabel>
                <AppSelect id="res-rag" value={rag} onChange={setRag} placeholder="Not recorded" options={rags.map((r) => ({ value: r, label: r }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="res-clarity">Interface clarity</FieldLabel>
                <AppSelect id="res-clarity" value={clarity} onChange={setClarity} placeholder="Not recorded" options={clarities.map((r) => ({ value: r, label: r }))} />
              </Field>
            </div>
          </>
        )}
        <Field>
          <FieldLabel htmlFor="res-obs">Observations</FieldLabel>
          <Textarea id="res-obs" rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="res-notes">Notes</FieldLabel>
          <Textarea id="res-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="res-complete" checked={complete} onCheckedChange={(c) => setComplete(c === true)} />
          <FieldLabel htmlFor="res-complete">Mark the experiment as Completed (otherwise it goes to Under Review)</FieldLabel>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!canSave}
          onClick={() => {
            const expId = actions.enterResults(item.id, {
              waterSepPct: waterNum,
              residualWaterPct: residualNum,
              ragLayer: rag || null,
              clarity: clarity || null,
              observations: observations.trim(),
              notes: notes.trim(),
              ron: ronNum,
              markCompleted: complete,
            })
            toast.success(expId ? `Results saved to ${expId}` : 'Results saved')
            onClose()
          }}
        >
          Save results
        </Button>
      </DialogFooter>
    </>
  )
}

export function SupportDialog({ item, onClose }: { item: TestingPlanItem | null; onClose: () => void }) {
  const { state } = useApp()
  const dem = item ? item.supportingExperimentIds.map((id) => state.experiments.find((e) => e.id === id)).filter((e) => !!e) : []
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Supporting tests for {item?.id}</DialogTitle>
          <DialogDescription>Recorded experiments that motivated this planned test.</DialogDescription>
        </DialogHeader>
        {dem.length ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Formulation</TableHead>
                  <TableHead className="text-right">Dosage (ppm)</TableHead>
                  <TableHead className="text-right">Water sep. (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dem.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <ExpLink id={e.id} />
                    </TableCell>
                    <TableCell>{e.formulationId}</TableCell>
                    <TableCell className="text-right"><Val v={e.dosagePpm} /></TableCell>
                    <TableCell className="text-right"><Val v={e.waterSepPct} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {item?.supportingExperimentIds.length ? `Linked records: ${item.supportingExperimentIds.join(', ')}.` : 'This planned test has no linked historical experiments.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CancelPlanDialog({ item, onClose }: { item: TestingPlanItem | null; onClose: () => void }) {
  const { actions } = useApp()
  return (
    <AlertDialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {item?.id}?</AlertDialogTitle>
          <AlertDialogDescription>
            The planned test is marked Cancelled and any linked experiment that has not been completed is cancelled too. Recorded results are not deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep test</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (!item) return
              actions.setPlanStatus(item.id, 'Cancelled')
              toast(`${item.id} cancelled`)
              onClose()
            }}
          >
            Cancel planned test
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

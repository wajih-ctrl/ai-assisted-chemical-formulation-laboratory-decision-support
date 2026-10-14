'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useApp } from '@/lib/store'
import { TODAY_ISO } from '@/lib/seed'
import type { Recommendation } from '@/lib/types'
import { AppSelect } from './pickers'

function numOrNull(v: string): number | null {
  const n = Number(v)
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

export function ModifyDialog({ rec, onClose }: { rec: Recommendation | null; onClose: () => void }) {
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{rec ? <ModifyForm key={rec.id} rec={rec} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function ModifyForm({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const { state, actions } = useApp()
  const isGas = rec.workflow === 'gasoline'
  const [dosage, setDosage] = useState(String(rec.dosagePpm))
  const [temp, setTemp] = useState(rec.tempC === null ? '' : String(rec.tempC))
  const [settling, setSettling] = useState(rec.settlingMin === null ? '' : String(rec.settlingMin))
  const [crudeId, setCrudeId] = useState(rec.crudeId)
  const [note, setNote] = useState('')
  const dosageNum = numOrNull(dosage)
  const dosageInvalid = dosageNum === null || dosageNum <= 0

  const save = () => {
    if (dosageInvalid || dosageNum === null) return
    actions.updateRecommendation(rec.id, {
      dosagePpm: dosageNum,
      tempC: numOrNull(temp),
      settlingMin: numOrNull(settling),
      crudeId,
      modified: true,
      status: 'Under Review',
      rationale: note.trim() ? `${rec.rationale} Chemist note: ${note.trim()}` : rec.rationale,
    })
    actions.log('formulation-reviewed', `${rec.id} test conditions modified by chemist`, '/recommendations')
    toast.success(`${rec.id} conditions updated`)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Modify test conditions</DialogTitle>
        <DialogDescription>
          Adjust the proposed parameters for {rec.id}. The recommendation stays under review until you add it to the testing plan.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={dosageInvalid || undefined}>
          <FieldLabel htmlFor="mod-dosage">{isGas ? 'Booster dosage (ppm)' : 'Suggested dosage (ppm)'}</FieldLabel>
          <Input id="mod-dosage" inputMode="decimal" value={dosage} onChange={(e) => setDosage(e.target.value)} aria-invalid={dosageInvalid} />
          {dosageInvalid ? <FieldDescription>Enter a dosage greater than zero.</FieldDescription> : null}
        </Field>
        {!isGas ? (
          <>
            <Field>
              <FieldLabel htmlFor="mod-crude">Crude sample</FieldLabel>
              <AppSelect
                id="mod-crude"
                value={crudeId}
                onChange={setCrudeId}
                options={state.crudes.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mod-temp">Temperature (°C)</FieldLabel>
                <Input id="mod-temp" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="mod-settling">Settling time (min)</FieldLabel>
                <Input id="mod-settling" inputMode="decimal" value={settling} onChange={(e) => setSettling(e.target.value)} />
              </Field>
            </div>
          </>
        ) : null}
        <Field>
          <FieldLabel htmlFor="mod-note">Reason for the change</FieldLabel>
          <Textarea id="mod-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional. Recorded with the recommendation." />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={dosageInvalid}>
          Save conditions
        </Button>
      </DialogFooter>
    </>
  )
}

export function RejectDialog({ rec, onClose }: { rec: Recommendation | null; onClose: () => void }) {
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{rec ? <RejectForm key={rec.id} rec={rec} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function RejectForm({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const { actions } = useApp()
  const [reason, setReason] = useState('')
  return (
    <>
      <DialogHeader>
        <DialogTitle>Reject {rec.id}</DialogTitle>
        <DialogDescription>The recommendation moves to the Rejected tab. You can restore it later.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reject-reason">Reason</FieldLabel>
          <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: duplicate of a planned test." />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Keep recommendation
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            actions.rejectRecommendation(rec.id, reason.trim())
            toast(`${rec.id} rejected`)
            onClose()
          }}
        >
          Reject recommendation
        </Button>
      </DialogFooter>
    </>
  )
}

export function AddToPlanDialog({ rec, onClose }: { rec: Recommendation | null; onClose: () => void }) {
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{rec ? <PlanForm key={rec.id} rec={rec} onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  )
}

function PlanForm({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const { state, actions } = useApp()
  const technicians = state.users.filter((u) => u.role === 'technician' && u.status === 'Active')
  const [assignee, setAssignee] = useState('none')
  const [date, setDate] = useState(TODAY_ISO)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add {rec.id} to the testing plan</DialogTitle>
        <DialogDescription>The test is added with the status Proposed. It still needs chemist approval before it can be scheduled.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="plan-tech">Assigned technician</FieldLabel>
          <AppSelect
            id="plan-tech"
            value={assignee}
            onChange={setAssignee}
            options={[{ value: 'none', label: 'Unassigned' }, ...technicians.map((u) => ({ value: u.id, label: u.name }))]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-date">Planned date</FieldLabel>
          <Input id="plan-date" type="date" value={date} min={TODAY_ISO} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!date}
          onClick={() => {
            const planId = actions.addRecommendationToPlan(rec.id, { assigneeId: assignee === 'none' ? null : assignee, plannedDate: date })
            if (planId) toast.success(`${planId} created from ${rec.id}`)
            onClose()
          }}
        >
          Add to plan
        </Button>
      </DialogFooter>
    </>
  )
}

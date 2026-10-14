'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowUpRightIcon, Columns2Icon, FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useApp } from '@/lib/store'
import { fmtDate } from '@/lib/format'
import { Dl, FormulationChip, KeyValue, StatusPill, Val } from './primitives'

export function ExperimentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, actions } = useApp()
  const exp = id ? state.experiments.find((e) => e.id === id) : undefined
  const f = exp ? state.formulations.find((x) => x.id === exp.formulationId) : undefined
  const tech = exp ? state.users.find((u) => u.id === exp.technicianId) : undefined
  const crude = exp ? state.crudes.find((c) => c.id === exp.crudeId) : undefined

  return (
    <Sheet open={!!exp} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        {exp ? (
          <>
            <SheetHeader className="gap-1 border-b pr-12">
              <p className="eyebrow">Experiment</p>
              <SheetTitle className="font-heading text-lg text-ink">{exp.id}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <FormulationChip id={exp.formulationId} color={f?.color} />
                <StatusPill status={exp.status} />
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <Dl className="grid-cols-2">
                <KeyValue label="Test date">{fmtDate(exp.testDate)}</KeyValue>
                <KeyValue label="Technician">{tech?.name ?? 'Unassigned'}</KeyValue>
                <KeyValue label="Crude sample">
                  {crude ? `${crude.id} · ${crude.name}` : exp.crudeId}
                </KeyValue>
                <KeyValue label="Water cut">
                  <Val v={exp.waterCutPct} unit="%" />
                </KeyValue>
                <KeyValue label="Dosage">
                  <Val v={exp.dosagePpm} unit="ppm" />
                </KeyValue>
                <KeyValue label="Temperature">
                  <Val v={exp.tempC} unit="°C" />
                </KeyValue>
                <KeyValue label="Settling time">
                  <Val v={exp.settlingMin} unit="min" />
                </KeyValue>
                <KeyValue label="Mixing">{exp.mixing}</KeyValue>
              </Dl>
              <Separator />
              <Dl className="grid-cols-2">
                <KeyValue label="Water separation">
                  <Val v={exp.waterSepPct} unit="%" className="text-lg font-semibold" />
                </KeyValue>
                <KeyValue label="Residual water (BS&W)">
                  <Val v={exp.residualWaterPct} unit="%" digits={1} />
                </KeyValue>
                <KeyValue label="Rag layer">{exp.ragLayer ?? <span className="text-xs italic text-subtle">Not recorded</span>}</KeyValue>
                <KeyValue label="Interface clarity">{exp.clarity ?? <span className="text-xs italic text-subtle">Not recorded</span>}</KeyValue>
              </Dl>
              {exp.observations ? (
                <div className="flex flex-col gap-1">
                  <p className="eyebrow">Observations</p>
                  <p className="text-sm leading-relaxed text-ink">{exp.observations}</p>
                </div>
              ) : null}
              {exp.notes ? (
                <div className="flex flex-col gap-1">
                  <p className="eyebrow">Notes</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{exp.notes}</p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t p-4">
              <Button render={<Link href={`/experiments/${exp.id}`} />}>
                Open full record
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  actions.toggleCompareExperiment(exp.id)
                  toast.success(`${exp.id} added to the comparison selection`)
                }}
              >
                <Columns2Icon data-icon="inline-start" />
                Compare
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  actions.addReportItem({ kind: 'experiment', title: `${exp.id}: ${exp.formulationId} on ${exp.crudeId}`, detail: `${exp.dosagePpm} ppm, ${exp.tempC} °C, ${exp.settlingMin} min`, refs: [exp.id] })
                  toast.success(`${exp.id} added to the report draft`)
                }}
              >
                <FileTextIcon data-icon="inline-start" />
                Add to report
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

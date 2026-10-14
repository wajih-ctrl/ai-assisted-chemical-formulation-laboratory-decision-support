'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/lib/store'
import { fmtDateTime } from '@/lib/format'
import type { ImportResult, WorkflowId } from '@/lib/types'
import { Notice, Panel } from './primitives'

function Stat({ label, value, tone, hint }: { label: string; value: number; tone: string; hint: string }) {
  return (
    <div className="panel flex flex-col gap-1 p-4">
      <p className="eyebrow">{label}</p>
      <p className={`tnum font-heading text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

function ReasonTable({ rows, caption }: { rows: { row: number; reason: string }[]; caption: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-24">Source row</TableHead>
          <TableHead>{caption}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.row}-${r.reason}`}>
            <TableCell className="tnum font-medium text-ink">{r.row}</TableCell>
            <TableCell className="whitespace-normal text-muted-foreground">{r.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ImportResultView({ result, workflow, fileName }: { result: ImportResult; workflow: WorkflowId; fileName: string }) {
  const { actions } = useApp()
  const router = useRouter()

  function openImported() {
    actions.setWorkflow(workflow)
    router.push('/experiments')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel flex items-start gap-3 p-4">
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success-ink" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold text-ink">Import complete</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-ink">{fileName}</span> was processed at {fmtDateTime(result.at)}. Valid records were added to this demo session only and
            will clear when the session ends or the demo is reset.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Added" value={result.added} tone="text-success-ink" hint="Records now available in Experiments and analysis." />
        <Stat label="Flagged" value={result.flagged} tone="text-amber-ink" hint="Added with a warning, such as a missing result stored as Not measured." />
        <Stat label="Skipped" value={result.skipped} tone="text-rust-ink" hint="Not added because of an error such as a duplicate, unknown ID or invalid number." />
      </div>

      {result.skippedReasons.length > 0 ? (
        <Panel title={`Skipped rows (${result.skippedReasons.length})`} bodyClassName="p-0">
          <ReasonTable rows={result.skippedReasons} caption="Reason" />
        </Panel>
      ) : null}
      {result.flaggedReasons.length > 0 ? (
        <Panel title={`Flagged rows (${result.flaggedReasons.length})`} description="These were added. Review them before relying on them in analysis." bodyClassName="p-0">
          <ReasonTable rows={result.flaggedReasons} caption="Warning" />
        </Panel>
      ) : null}

      {result.addedIds.length > 0 ? (
        <Panel title="New experiment IDs" bodyClassName="flex flex-wrap gap-1.5">
          {result.addedIds.map((id) => (
            <Link key={id} href={`/experiments/${id}`} className="tnum rounded-md border bg-muted px-2 py-1 text-xs font-medium text-teal-ink hover:underline">
              {id}
            </Link>
          ))}
        </Panel>
      ) : (
        <Notice tone="amber">No valid rows were available, so nothing was added.</Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => {
            actions.resetImportSession()
            router.push('/data/upload')
          }}
        >
          Import another dataset
        </Button>
        <Button onClick={openImported} disabled={result.added === 0}>
          Open Imported Experiments
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

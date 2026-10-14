'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangleIcon, ArrowRightIcon, DownloadIcon, FileSpreadsheetIcon, RefreshCwIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { plural } from '@/lib/format'
import { CSV_TEMPLATE, detectWorkflow, fieldsFor, parseCsv, SAMPLE_SOURCES, suggestMapping } from '@/lib/import-data'
import type { WorkflowId } from '@/lib/types'
import { ImportStepper } from './import-stepper'
import { Notice, PageHeader, Panel, Pill } from './primitives'

const MAX_BYTES = 5 * 1024 * 1024

interface Rejected {
  name: string
  kind: string
  reason: string
}

function kindOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'csv' ? 'CSV' : ext === 'xls' ? 'XLS' : ext === 'xlsx' ? 'XLSX' : ext ? ext.toUpperCase() : 'Unknown'
}

async function parseExcel(file: File): Promise<{ columns: string[]; rows: Record<string, string>[] } | null> {
  const { readSheet } = await import('read-excel-file/browser')
  const grid = await readSheet(file)
  const populated = grid.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (populated.length < 2) return null

  const text = (cell: unknown) => cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '').trim()

  const seen = new Map<string, number>()
  const columns = populated[0].map((cell, index) => {
    const base = text(cell) || `Column ${index + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
  const rows = populated.slice(1).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, text(row[index])])),
  )

  return rows.length ? { columns, rows } : null
}

export function UploadView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<Rejected | null>(null)
  const session = state.importSession
  const uploaded = session.customSource
  const allowed = can(role, 'data:import')
  const ready = !!uploaded || !!session.datasetId

  const activeWorkflow: WorkflowId = uploaded?.workflow ?? SAMPLE_SOURCES.find((s) => s.datasetId === session.datasetId)?.workflow ?? state.workflow
  const fields = fieldsFor(activeWorkflow)

  function reset() {
    setRejected(null)
    actions.resetImportSession()
    if (inputRef.current) inputRef.current.value = ''
  }

  function chooseSample(id: string) {
    const src = SAMPLE_SOURCES.find((s) => s.datasetId === id)
    if (!src) return
    setRejected(null)
    actions.setImportSession({
      datasetId: id,
      customSource: null,
      fileName: src.fileName,
      fileKind: 'Sample dataset',
      mapping: suggestMapping(src.columns, src.workflow),
      unitConfirmed: false,
      validated: false,
      result: null,
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const kind = kindOf(file.name)
    if (!['CSV', 'XLSX'].includes(kind)) {
      actions.resetImportSession()
      setRejected({
        name: file.name,
        kind,
        reason: kind === 'XLS'
          ? 'Legacy .xls workbooks are not supported by this browser-only prototype. Save the workbook as .xlsx or .csv, or use a sample dataset below.'
          : 'This file type is not supported. Use a .csv or .xlsx file, or pick a sample dataset below.',
      })
      return
    }
    if (file.size > MAX_BYTES) {
      actions.resetImportSession()
      setRejected({ name: file.name, kind, reason: 'This file is larger than the 5 MB prototype limit. Nothing was imported.' })
      return
    }

    try {
      const excel = kind === 'CSV' ? null : await parseExcel(file)
      const parsed = kind === 'CSV' ? parseCsv(await file.text()) : excel
      if (!parsed) {
        actions.resetImportSession()
        setRejected({
          name: file.name,
          kind,
          reason: kind === 'CSV'
            ? 'We could not find a header row and at least one data row in this file. Nothing was imported.'
            : 'We could not find a readable worksheet with a header row and at least one data row. Nothing was imported.',
        })
        return
      }
      const workflow = detectWorkflow(parsed.columns)
      setRejected(null)
      actions.setImportSession({
        datasetId: null,
        customSource: { fileName: file.name, workflow, columns: parsed.columns, rows: parsed.rows },
        fileName: file.name,
        fileKind: kind,
        mapping: suggestMapping(parsed.columns, workflow),
        unitConfirmed: false,
        validated: false,
        result: null,
      })
      toast.success(`${file.name} read in your browser: ${plural(parsed.rows.length, 'row')}, ${plural(parsed.columns.length, 'column')}`)
    } catch {
      actions.resetImportSession()
      setRejected({
        name: file.name,
        kind,
        reason: 'This file could not be read. Check that it is a valid, unencrypted CSV or Excel workbook and try again.',
      })
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bottle-test-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function next() {
    router.push('/data/mapping')
  }

  const shown = uploaded ? { name: uploaded.fileName, kind: session.fileKind ?? 'File', detail: `${plural(uploaded.rows.length, 'row')} · ${plural(uploaded.columns.length, 'column')} · processed in this browser` } : null

  return (
    <>
      <PageHeader
        eyebrow="Historical data"
        title="Import Historical Data"
        description="Bring past laboratory results into this session. Files are read entirely in your browser; nothing is uploaded to a server."
      />
      <ImportStepper current={1} />

      {!allowed ? (
        <Notice tone="amber" title="Import is restricted for this role" className="mb-6">
          Importing data is available to the Formulation Chemist and Administrator roles. Switch role from the header to continue.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Upload a file" description="Accepted: .csv and .xlsx. CSV and modern Excel files are parsed locally in this browser." bodyClassName="flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (allowed) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                if (allowed) void handleFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                dragging ? 'border-primary bg-teal-soft' : 'bg-muted/40',
                shown && 'border-solid border-primary/50 bg-teal-soft/50',
                rejected && 'border-solid border-destructive/50 bg-rust-soft/50',
              )}
            >
              {shown ? (
                <>
                  <FileSpreadsheetIcon className="size-8 text-teal-ink" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <p className="break-all font-medium text-ink">{shown.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <Pill tone="teal" className="mr-1.5">
                        {shown.kind}
                      </Pill>
                      {shown.detail}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                      <RefreshCwIcon data-icon="inline-start" />
                      Replace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      <XIcon data-icon="inline-start" />
                      Remove
                    </Button>
                  </div>
                </>
              ) : rejected ? (
                <>
                  <AlertTriangleIcon className="size-8 text-rust-ink" aria-hidden />
                  <div className="flex max-w-md flex-col gap-1">
                    <p className="break-all font-medium text-ink">
                      {rejected.name} <span className="text-sm font-normal text-muted-foreground">({rejected.kind})</span>
                    </p>
                    <p role="alert" className="text-sm leading-relaxed text-rust-ink">
                      {rejected.reason}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                      <RefreshCwIcon data-icon="inline-start" />
                      Choose another file
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      <XIcon data-icon="inline-start" />
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloudIcon className="size-8 text-muted-foreground" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium text-ink">{dragging ? 'Drop to read this file' : 'Drag a laboratory file here'}</p>
                    <p className="text-sm text-muted-foreground">.csv or .xlsx up to 5 MB</p>
                  </div>
                  <Button variant="outline" disabled={!allowed} onClick={() => inputRef.current?.click()}>
                    Select file
                  </Button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose a data file"
                disabled={!allowed}
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>
          </Panel>

          <Panel title="Use a Sample Laboratory Dataset" description="Seeded demonstration data with realistic column names and a few deliberate data-quality issues." bodyClassName="flex flex-col gap-2">
            <fieldset className="flex flex-col gap-2" disabled={!allowed}>
              <legend className="sr-only">Sample datasets</legend>
              {SAMPLE_SOURCES.map((s) => {
                const ds = state.datasets.find((d) => d.id === s.datasetId)
                const checked = session.datasetId === s.datasetId
                return (
                  <label
                    key={s.datasetId}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      checked && 'border-primary bg-teal-soft/50',
                    )}
                  >
                    <input type="radio" name="sample-dataset" className="mt-1 accent-[var(--primary)]" checked={checked} onChange={() => chooseSample(s.datasetId)} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{ds?.name ?? s.fileName}</span>
                        <Pill tone={s.workflow === 'demulsifier' ? 'teal' : 'blue'}>{s.workflow === 'demulsifier' ? 'Demulsifier' : 'Gasoline'}</Pill>
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">{ds?.description}</span>
                      <span className="tnum text-xs text-muted-foreground">
                        {s.fileName} · {plural(s.rows.length, 'row')} · {plural(s.columns.length, 'column')}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          </Panel>
        </div>

        <Panel
          title="Expected fields"
          description={`Fields recognised for the ${activeWorkflow === 'demulsifier' ? 'demulsifier' : 'gasoline'} workflow. Column names can differ; you map them on the next step.`}
          action={
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <DownloadIcon data-icon="inline-start" />
              CSV template
            </Button>
          }
          bodyClassName="p-0"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Field</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="text-ink">{f.label}</TableCell>
                  <TableCell className="text-muted-foreground">{f.unit ?? 'None'}</TableCell>
                  <TableCell className="text-right">{f.required ? <Pill tone="amber">Required</Pill> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            A blank value is stored as <span className="font-medium text-ink">Not measured</span>, never as zero. A recorded 0 stays 0. Units other than ppm are never
            converted silently.
          </p>
        </Panel>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {ready ? `Ready: ${session.fileName}` : 'Select a file or a sample dataset to continue.'}
        </p>
        <Button disabled={!ready || !allowed} onClick={next}>
          Continue
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircleIcon, AlertTriangleIcon, ArrowLeftIcon, CheckCircle2Icon, CheckIcon, CircleDashedIcon, RotateCcwIcon, ShieldCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { plural } from '@/lib/format'
import { nextExperimentId } from '@/lib/analysis'
import { TODAY_ISO } from '@/lib/seed'
import {
  analyseImport,
  buildImportedExperiments,
  buildImportedGasoline,
  fieldsFor,
  sourceFromSession,
  suggestMapping,
  UNIT_FIELD,
  type ParsedRow,
} from '@/lib/import-data'
import { ImportResultView } from './import-result'
import { ImportStepper } from './import-stepper'
import { AppSelect, type Option } from './pickers'
import { EmptyNote, Notice, PageHeader, Panel, Pill } from './primitives'

const NUMERIC_KEYS = ['dosagePpm', 'tempC', 'settlingMin', 'waterSepPct', 'residualWaterPct', 'boosterPpm', 'ron']
const NONE = '__none'

function Cell({ value, fieldKey }: { value: string; fieldKey: string }) {
  const v = value.trim()
  if (v === '') {
    return (
      <span className="rounded bg-amber-soft px-1 text-xs italic text-amber-ink" title="Blank in source. Will be stored as Not measured, not zero.">
        blank
      </span>
    )
  }
  if (NUMERIC_KEYS.includes(fieldKey)) {
    const n = Number(v)
    if (!Number.isFinite(n)) {
      return (
        <span className="rounded bg-rust-soft px-1 text-rust-ink" title="Not a number">
          {v}
        </span>
      )
    }
    return (
      <span className="tnum" title={n === 0 ? 'A recorded zero is kept as 0' : undefined}>
        {v}
        {n === 0 ? <span className="ml-1 text-[10px] text-muted-foreground">recorded 0</span> : null}
      </span>
    )
  }
  if (fieldKey === 'doseUnit' && v.toLowerCase() !== 'ppm') {
    return <span className="rounded bg-amber-soft px-1 text-amber-ink">{v}</span>
  }
  return <span>{v}</span>
}

function SummaryTile({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <span className={cn('flex size-8 items-center justify-center rounded-md', tone)}>{icon}</span>
      <div>
        <p className="tnum font-heading text-xl font-semibold leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function MappingView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const session = state.importSession
  const source = sourceFromSession(session.datasetId, session.customSource)
  const [showAll, setShowAll] = useState(false)
  const [onlyIssues, setOnlyIssues] = useState(false)
  const allowed = can(role, 'data:import')

  const analysis = useMemo(() => {
    if (!source) return null
    return analyseImport({
      workflow: source.workflow,
      columns: source.columns,
      rows: source.rows,
      mapping: session.mapping,
      unitConfirmed: session.unitConfirmed,
      existingIds: [...state.experiments.map((e) => e.id), ...state.gasoline.map((e) => e.id)],
      formulations: state.formulations,
      crudes: state.crudes,
      blends: state.blends,
    })
  }, [source, session.mapping, session.unitConfirmed, state.experiments, state.gasoline, state.formulations, state.crudes, state.blends])

  if (!source || !analysis) {
    return (
      <>
        <PageHeader eyebrow="Historical data" title="Preview & Map Columns" />
        <ImportStepper current={2} />
        <EmptyNote
          title="No data source selected"
          action={
            <Button render={<Link href="/data/upload" />}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to Select Data Source
            </Button>
          }
        >
          Choose a file or a sample dataset first, then return here to map its columns.
        </EmptyNote>
      </>
    )
  }

  if (session.result) {
    return (
      <>
        <PageHeader eyebrow="Historical data" title="Import Complete" description="Review what was added and what was left out." />
        <ImportStepper current={3} />
        <ImportResultView result={session.result} workflow={source.workflow} fileName={source.fileName} />
      </>
    )
  }

  const fields = fieldsFor(source.workflow)
  const mapping = session.mapping
  const validated = session.validated
  const fieldOptions: Option[] = [
    { value: NONE, label: 'Do not import' },
    ...[...fields, UNIT_FIELD].map((f) => ({ value: f.key, label: `${f.label}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}` })),
  ]
  const mappedKeys = Object.values(mapping).filter(Boolean)
  const duplicateKeys = new Set(mappedKeys.filter((k, i) => mappedKeys.indexOf(k) !== i))
  const hasGlobalError = analysis.globalIssues.some((g) => g.severity === 'error')
  const nonPpm = Object.entries(analysis.unitValues).filter(([u]) => u.trim() !== '' && u.toLowerCase() !== 'ppm')
  const dosageMapped = mappedKeys.includes(source.workflow === 'demulsifier' ? 'dosagePpm' : 'boosterPpm')

  const affected = (r: ParsedRow) => r.issues.some((i) => i.severity !== 'info')
  const pool = validated && onlyIssues ? analysis.rows.filter(affected) : analysis.rows
  const rowsShown = showAll || (validated && onlyIssues) ? pool : pool.slice(0, 8)

  function setMap(col: string, key: string) {
    actions.setImportSession({ mapping: { ...mapping, [col]: key === NONE ? '' : key }, validated: false })
  }
  function resetMapping() {
    actions.setImportSession({ mapping: suggestMapping(source!.columns, source!.workflow), validated: false, unitConfirmed: false })
    toast('Mapping reset to the suggested columns')
  }
  function validate() {
    actions.setImportSession({ validated: true })
    const errs = analysis!.globalIssues.filter((g) => g.severity === 'error').length
    if (errs) toast.error('Validation found problems that block the import')
    else toast.success(`Validated: ${analysis!.added} can be added, ${analysis!.skipped} would be skipped`)
  }
  function confirm() {
    if (!allowed || !analysis) return
    const src = source!
    const meta = { datasetId: src.datasetId, fileName: src.fileName }
    const ids = [...state.experiments.map((e) => e.id), ...state.gasoline.map((e) => e.id)]
    const make = (prefix: 'DEM' | 'GAS') => () => {
      const id = nextExperimentId(ids, prefix)
      ids.push(id)
      return id
    }
    const dem = src.workflow === 'demulsifier' ? buildImportedExperiments(analysis.rows, meta, make('DEM'), state.crudes, TODAY_ISO) : []
    const gas = src.workflow === 'gasoline' ? buildImportedGasoline(analysis.rows, meta, make('GAS'), state.blends, TODAY_ISO) : []
    actions.addExperiments(dem, gas)
    const addedIds = [...dem, ...gas].map((e) => e.id)
    const msgs = (r: ParsedRow, sev: 'error' | 'warning') =>
      r.issues
        .filter((i) => i.severity === sev)
        .map((i) => i.message)
        .join(' ')
    actions.log('dataset-imported', `${plural(addedIds.length, 'record')} imported from ${src.fileName}`, '/experiments')
    actions.setImportSession({
      result: {
        datasetId: src.datasetId,
        added: addedIds.length,
        skipped: analysis.skipped,
        flagged: analysis.flagged,
        addedIds,
        skippedReasons: analysis.rows.filter((r) => r.state === 'skipped').map((r) => ({ row: r.index + 1, reason: msgs(r, 'error') || 'Blocked by an unmapped required field.' })),
        flaggedReasons: analysis.rows.filter((r) => r.state === 'flagged').map((r) => ({ row: r.index + 1, reason: msgs(r, 'warning') })),
        at: new Date().toISOString(),
      },
    })
    toast.success(`${plural(addedIds.length, 'experiment')} added to this session`)
  }

  const requiredFields = fields.filter((f) => f.required)
  const canConfirm = allowed && validated && !hasGlobalError && analysis.added > 0

  return (
    <>
      <PageHeader
        eyebrow="Historical data"
        title="Preview & Map Columns"
        description="Match each column in your file to a laboratory field, then validate before anything is added."
        meta={
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-ink">{source.fileName}</span>
            <Pill tone={source.workflow === 'demulsifier' ? 'teal' : 'blue'}>{source.workflow === 'demulsifier' ? 'Demulsifier' : 'Gasoline'}</Pill>
            <span className="tnum">
              {plural(source.rows.length, 'row')} · {plural(source.columns.length, 'column')}
            </span>
          </p>
        }
      />
      <ImportStepper current={2} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {validated ? (
            <Panel title="Validation results" description="Nothing has been added yet. Rows marked Skip are left out; rows marked Flag are added with a warning." bodyClassName="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Ready to import" value={analysis.rows.filter((r) => r.state === 'ok').length} tone="bg-success-soft text-success-ink" icon={<CheckIcon className="size-4" aria-hidden />} />
                <SummaryTile label="Import with a flag" value={analysis.flagged} tone="bg-amber-soft text-amber-ink" icon={<AlertTriangleIcon className="size-4" aria-hidden />} />
                <SummaryTile label="Will be skipped" value={analysis.skipped} tone="bg-rust-soft text-rust-ink" icon={<AlertCircleIcon className="size-4" aria-hidden />} />
              </div>
              {analysis.globalIssues.map((g) => (
                <Notice key={g.message} tone={g.severity === 'error' ? 'rust' : 'amber'}>
                  {g.message}
                </Notice>
              ))}
              {analysis.rows.some(affected) ? (
                <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1 text-sm">
                  {analysis.rows.filter(affected).map((r) => (
                    <li key={r.index} className="flex items-start gap-2">
                      {r.state === 'skipped' ? <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-rust-ink" aria-label="Skipped" /> : <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-label="Flagged" />}
                      <span className="min-w-0">
                        <span className="tnum font-medium text-ink">
                          Row {r.index + 1}
                          {r.values.expRef ? ` (${r.values.expRef})` : ''}
                        </span>
                        <span className="text-muted-foreground">: {r.issues.filter((i) => i.severity !== 'info').map((i) => i.message).join(' ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-success-ink">
                  <CheckCircle2Icon className="size-4" aria-hidden /> No issues found.
                </p>
              )}
            </Panel>
          ) : null}

          <Panel
            title="Preview"
            description={validated && onlyIssues ? `${pool.length} rows with issues` : `Showing ${rowsShown.length} of ${source.rows.length} rows. Blank cells and invalid numbers are highlighted.`}
            action={
              <div className="flex items-center gap-4">
                {validated ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch size="sm" checked={onlyIssues} onCheckedChange={setOnlyIssues} aria-label="Show only rows with issues" />
                    Issues only
                  </label>
                ) : null}
                {!(validated && onlyIssues) && source.rows.length > 8 ? (
                  <Button variant="ghost" size="xs" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? 'Show first 8' : `Show all ${source.rows.length}`}
                  </Button>
                ) : null}
              </div>
            }
            bodyClassName="p-0"
          >
            <div className="max-h-[32rem] overflow-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16">Row</TableHead>
                    {source.columns.map((c) => {
                      const key = mapping[c]
                      const label = [...fields, UNIT_FIELD].find((f) => f.key === key)?.label
                      return (
                        <TableHead key={c} className="align-top">
                          <span className="block font-mono text-xs text-ink">{c}</span>
                          <span className={cn('block text-[11px] font-normal', label ? 'text-teal-ink' : 'text-subtle')}>{label ?? 'Not mapped'}</span>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsShown.map((r) => (
                    <TableRow key={r.index} className={cn(validated && r.state === 'skipped' && 'bg-rust-soft/40', validated && r.state === 'flagged' && 'bg-amber-soft/40')}>
                      <TableCell className="tnum">
                        <span className="text-muted-foreground">{r.index + 1}</span>
                        {validated && r.state !== 'ok' ? (
                          <span className={cn('ml-1.5 text-[11px] font-medium', r.state === 'skipped' ? 'text-rust-ink' : 'text-amber-ink')}>{r.state === 'skipped' ? 'Skip' : 'Flag'}</span>
                        ) : null}
                      </TableCell>
                      {source.columns.map((c) => (
                        <TableCell key={c} className={cn('whitespace-nowrap', !mapping[c] && 'text-subtle')}>
                          <Cell value={r.raw[c] ?? ''} fieldKey={mapping[c]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-20">
          <Panel title="Required fields" bodyClassName="flex flex-col gap-1.5">
            {requiredFields.map((f) => {
              const ok = mappedKeys.includes(f.key)
              return (
                <p key={f.key} className="flex items-center gap-2 text-sm">
                  {ok ? <CheckIcon className="size-4 text-success-ink" aria-hidden /> : <CircleDashedIcon className="size-4 text-rust-ink" aria-hidden />}
                  <span className={ok ? 'text-ink' : 'text-rust-ink'}>{f.label}</span>
                  <span className="sr-only">{ok ? 'mapped' : 'not mapped'}</span>
                </p>
              )
            })}
          </Panel>

          {dosageMapped ? (
            <Panel title="Dosage units" bodyClassName="flex flex-col gap-3">
              {analysis.unitColumn ? (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Units found in <span className="font-mono text-xs text-ink">{analysis.unitColumn}</span>:{' '}
                    {Object.entries(analysis.unitValues)
                      .map(([u, n]) => `${u || 'blank'} (${n})`)
                      .join(', ')}
                    .
                  </p>
                  {nonPpm.length > 0 ? (
                    <>
                      <Notice tone="amber">Values are never converted automatically. Rows with other units are skipped unless you confirm below.</Notice>
                      <label className="flex items-start gap-2 text-sm text-ink">
                        <Checkbox checked={session.unitConfirmed} onCheckedChange={(v) => actions.setImportSession({ unitConfirmed: v === true, validated: false })} className="mt-0.5" />
                        <span>
                          I confirm {nonPpm.map(([u]) => u).join(', ')} values should be read as ppm
                        </span>
                      </label>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No unit column is mapped. Dosage is read as ppm, as defined for this field, with no conversion applied.
                </p>
              )}
            </Panel>
          ) : null}

          <Panel
            title="Column mapping"
            description="* marks a required field."
            action={
              <Button variant="ghost" size="xs" onClick={resetMapping}>
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
            }
            bodyClassName="flex max-h-[30rem] flex-col gap-4 overflow-y-auto"
          >
            {source.columns.map((c, i) => {
              const key = mapping[c] ?? ''
              const dup = key !== '' && duplicateKeys.has(key)
              const sample = source.rows.find((r) => (r[c] ?? '').trim() !== '')?.[c]
              return (
                <div key={c} className="flex flex-col gap-1.5">
                  <label htmlFor={`map-${i}`} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-mono text-xs font-medium text-ink">{c}</span>
                    <span className="truncate text-xs text-muted-foreground">e.g. {sample ?? 'blank'}</span>
                  </label>
                  <AppSelect id={`map-${i}`} value={key === '' ? NONE : key} onChange={(v) => setMap(c, v)} options={fieldOptions} disabled={!allowed} aria-invalid={dup} />
                  {dup ? <p className="text-xs text-amber-ink">Another column is also mapped to this field. Only the first is used.</p> : null}
                </div>
              )
            })}
          </Panel>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" render={<Link href="/data/upload" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {hasGlobalError ? 'Map all required fields to continue.' : validated ? 'Validated. Ready to confirm.' : 'Validate before confirming.'}
          </p>
          <Button variant="outline" onClick={validate} disabled={!allowed}>
            <ShieldCheckIcon data-icon="inline-start" />
            Validate Data
          </Button>
          <Button onClick={confirm} disabled={!canConfirm}>
            Confirm Import
          </Button>
        </div>
      </div>
    </>
  )
}

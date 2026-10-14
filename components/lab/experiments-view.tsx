'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  CopyIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { fmtDate, plural } from '@/lib/format'
import { crudeLabel } from '@/lib/analysis'
import { EmptyNote, FormulationChip, GatedButton, Pill, StatusPill, Val } from './primitives'
import { MultiSelect, type Option } from './pickers'
import { applyFilters, buildChips, EMPTY_FILTERS, FilterSheet, type FilterRow, type Filters } from './experiment-filters'

type SortKey = 'id' | 'formulation' | 'sample' | 'dose' | 'temp' | 'settle' | 'result' | 'status' | 'date'
const PAGE_SIZE = 15

interface Column {
  key: SortKey
  label: string
  numeric?: boolean
}

export function ExperimentsView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const dem = state.workflow === 'demulsifier'
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [page, setPage] = useState(0)

  const rows = useMemo<FilterRow[]>(() => {
    if (dem)
      return state.experiments.map((e) => ({
        id: e.id,
        formulation: e.formulationId,
        sample: e.crudeId,
        dose: e.dosagePpm,
        temp: e.tempC,
        settle: e.settlingMin,
        result: e.waterSepPct,
        status: e.status,
        date: e.testDate,
      }))
    return state.gasoline.map((e) => ({
      id: e.id,
      formulation: e.blendId,
      sample: e.additiveType,
      dose: e.boosterPpm,
      temp: null,
      settle: null,
      result: e.ron,
      status: e.status,
      date: e.testDate,
    }))
  }, [dem, state.experiments, state.gasoline])

  const formulationOptions = useMemo<Option[]>(
    () =>
      dem
        ? state.formulations.filter((f) => rows.some((r) => r.formulation === f.id)).map((f) => ({ value: f.id, label: f.id, hint: f.name }))
        : state.blends.map((b) => ({ value: b.id, label: b.name })),
    [dem, rows, state.formulations, state.blends],
  )
  const sampleOptions = useMemo<Option[]>(
    () =>
      dem
        ? state.crudes.map((c) => ({ value: c.id, label: c.id, hint: c.name }))
        : [...new Set(rows.map((r) => r.sample))].sort().map((s) => ({ value: s, label: s })),
    [dem, rows, state.crudes],
  )
  const nameOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of [...formulationOptions, ...sampleOptions]) m.set(o.value, o.label)
    return (id: string) => m.get(id) ?? id
  }, [formulationOptions, sampleOptions])

  const sorted = useMemo(() => {
    const filtered = applyFilters(rows, filters)
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av === null && bv === null) return a.id.localeCompare(b.id)
      if (av === null) return 1
      if (bv === null) return -1
      const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return c === 0 ? a.id.localeCompare(b.id) : c * dir
    })
  }, [rows, filters, sort])

  const chips = buildChips(filters, state.workflow, nameOf)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  const columns: Column[] = dem
    ? [
        { key: 'id', label: 'Experiment ID' },
        { key: 'formulation', label: 'Formulation' },
        { key: 'sample', label: 'Crude Sample' },
        { key: 'dose', label: 'Dosage (ppm)', numeric: true },
        { key: 'temp', label: 'Temp. (°C)', numeric: true },
        { key: 'settle', label: 'Settling (min)', numeric: true },
        { key: 'result', label: 'Water Sep. (%)', numeric: true },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Test Date' },
      ]
    : [
        { key: 'id', label: 'Experiment ID' },
        { key: 'formulation', label: 'Blend' },
        { key: 'sample', label: 'Additive' },
        { key: 'dose', label: 'Booster (ppm)', numeric: true },
        { key: 'result', label: 'RON', numeric: true },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Test Date' },
      ]

  function patch(p: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...p }))
    setPage(0)
  }
  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'id' || key === 'formulation' || key === 'sample' ? 'asc' : 'desc' }))
    setPage(0)
  }
  function duplicate(id: string) {
    const nid = actions.duplicateExperiment(id)
    if (nid) {
      toast.success(`${nid} created as a draft copy of ${id}`)
      router.push(`/experiments/${nid}`)
    }
  }

  const canAdd = can(role, 'experiment:add')
  const canEdit = can(role, 'experiment:edit')
  const total = rows.length
  const selected = state.compare.experimentIds

  return (
    <>
      <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="eyebrow">Laboratory records</p>
          <h1 className="font-heading text-2xl font-semibold leading-tight text-ink md:text-[1.75rem]">Experiments</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Pill tone={dem ? 'teal' : 'blue'}>{dem ? 'Demulsifier bottle tests' : 'Gasoline blending'}</Pill>
            <span className="tnum">{plural(total, 'record')} in this session</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GatedButton allowed={can(role, 'data:import')} capability="data:import" variant="outline" render={<Link href="/data/upload" />}>
            <UploadIcon data-icon="inline-start" />
            Import Data
          </GatedButton>
          <GatedButton allowed={canAdd} capability="experiment:add" render={<Link href="/experiments/new" />}>
            <PlusIcon data-icon="inline-start" />
            Add Experiment
          </GatedButton>
        </div>
      </header>

      <section aria-label="Experiment records" className="panel min-w-0">
        <div className="flex flex-col gap-3 border-b p-3">
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <SearchIcon aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search by experiment ID"
                placeholder="Search by experiment ID"
                value={filters.q}
                onChange={(e) => patch({ q: e.target.value })}
              />
            </InputGroup>
            <MultiSelect className="w-auto min-w-44" label={dem ? 'Formulation' : 'Blend'} options={formulationOptions} selected={filters.formulations} onChange={(formulations) => patch({ formulations })} />
            <MultiSelect className="w-auto min-w-44" label={dem ? 'Crude' : 'Additive'} options={sampleOptions} selected={filters.samples} onChange={(samples) => patch({ samples })} />
            <FilterSheet
              workflow={state.workflow}
              value={filters}
              onChange={patch}
              formulationOptions={formulationOptions}
              sampleOptions={sampleOptions}
              formulationLabel={dem ? 'Formulation' : 'Blend'}
              sampleLabel={dem ? 'Crude source' : 'Additive'}
              activeCount={chips.length}
              resultCount={sorted.length}
            />
          </div>
          <div className="flex min-h-7 flex-wrap items-center gap-2">
            <p className="tnum text-sm text-muted-foreground" aria-live="polite">
              Showing <span className="font-medium text-ink">{sorted.length}</span> of {total}
            </p>
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-md border bg-muted py-0.5 pl-2 pr-0.5 text-xs text-ink">
                {c.label}
                <button type="button" aria-label={`Remove filter: ${c.label}`} onClick={() => patch(c.clear)} className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-ink">
                  <XIcon className="size-3" aria-hidden />
                </button>
              </span>
            ))}
            {chips.length > 0 ? (
              <Button variant="ghost" size="xs" onClick={() => patch({ ...EMPTY_FILTERS })}>
                Clear all
              </Button>
            ) : null}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6">
            <EmptyNote
              title="No experiments match these filters"
              action={
                <Button variant="outline" onClick={() => patch({ ...EMPTY_FILTERS })}>
                  Clear Filters
                </Button>
              }
            >
              Try widening a range or removing a filter. Records with no measured value never match a numeric range.
            </EmptyNote>
          </div>
        ) : (
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => {
                  const active = sort.key === c.key
                  return (
                    <TableHead key={c.key} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn(c.numeric && 'text-right')}>
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn('-mx-2 inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-md px-2 font-semibold hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', c.numeric && 'flex-row-reverse', active && 'text-ink')}
                      >
                        {c.label}
                        {active ? sort.dir === 'asc' ? <ArrowUpIcon className="size-3" aria-hidden /> : <ArrowDownIcon className="size-3" aria-hidden /> : <ArrowUpDownIcon className="size-3 opacity-40" aria-hidden />}
                      </button>
                    </TableHead>
                  )
                })}
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const inCompare = selected.includes(r.id)
                const f = dem ? state.formulations.find((x) => x.id === r.formulation) : undefined
                const b = dem ? undefined : state.blends.find((x) => x.id === r.formulation)
                return (
                  <TableRow key={r.id} onClick={() => router.push(`/experiments/${r.id}`)} className="cursor-pointer" data-state={inCompare ? 'selected' : undefined}>
                    <TableCell>
                      <Link href={`/experiments/${r.id}`} onClick={(e) => e.stopPropagation()} className="tnum -my-1 inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-ink underline-offset-2 hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                        {r.id}
                      </Link>
                      {inCompare ? <span className="ml-2 text-[11px] text-muted-foreground">Comparing</span> : null}
                    </TableCell>
                    <TableCell>
                      <FormulationChip id={r.formulation} color={f?.color ?? b?.color} label={b?.name} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dem ? crudeLabel(state.crudes, r.sample) : r.sample}</TableCell>
                    <TableCell className="text-right">
                      <Val v={r.dose} />
                    </TableCell>
                    {dem ? (
                      <>
                        <TableCell className="text-right">
                          <Val v={r.temp} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Val v={r.settle} />
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell className="text-right">
                      <Val v={r.result} digits={dem ? 0 : 1} className="font-medium" />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                    <TableCell className="tnum whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.id}`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{r.id}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/experiments/${r.id}`)}>
                              <EyeIcon /> View
                            </DropdownMenuItem>
                            {dem ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  actions.toggleCompareExperiment(r.id)
                                  toast(inCompare ? `${r.id} removed from comparison` : `${r.id} added to comparison`)
                                }}
                              >
                                <Columns2Icon /> {inCompare ? 'Remove from comparison' : 'Add to comparison'}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!canEdit} onClick={() => router.push(`/experiments/new?edit=${r.id}`)}>
                              <PencilIcon /> {canEdit ? 'Edit' : 'Edit (not permitted)'}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAdd} onClick={() => duplicate(r.id)}>
                              <CopyIcon /> {canAdd ? 'Duplicate as draft' : 'Duplicate (not permitted)'}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {sorted.length > PAGE_SIZE ? (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
            <p className="tnum text-sm text-muted-foreground">
              {current * PAGE_SIZE + 1} to {Math.min(sorted.length, (current + 1) * PAGE_SIZE)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                <ChevronLeftIcon data-icon="inline-start" />
                Previous
              </Button>
              <span className="tnum px-2 text-sm text-muted-foreground">
                Page {current + 1} of {pageCount}
              </span>
              <Button variant="outline" size="sm" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                Next
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </nav>
        ) : null}
      </section>

      {dem && selected.length > 0 ? (
        <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-lg">
          <p className="tnum text-sm text-ink">{plural(selected.length, 'experiment')} selected for comparison</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => actions.clearCompare()}>
              Clear
            </Button>
            <Button size="sm" render={<Link href="/comparison" />}>
              <Columns2Icon data-icon="inline-start" />
              Open comparison
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}

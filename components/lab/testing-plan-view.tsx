'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleSlashIcon,
  ClipboardPenLineIcon,
  EllipsisIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  PencilLineIcon,
  PlusIcon,
  UserRoundPlusIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/lib/store'
import { can, type Capability } from '@/lib/roles'
import { fmtDate, plural } from '@/lib/format'
import type { PlanStatus, TestingPlanItem, WorkflowId } from '@/lib/types'
import { AppSelect } from './pickers'
import { EmptyNote, ExpLink, FormulationChip, GatedButton, Notice, PageHeader, Panel, StatusPill, Val } from './primitives'
import { AddPlanDialog, AssignDialog, CancelPlanDialog, EditPlanDialog, ResultsDialog, SupportDialog, TechnicianRow } from './plan-dialogs'

const STATUS_ORDER: PlanStatus[] = ['Proposed', 'Approved for Testing', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']

const NEXT_STEP: Partial<Record<PlanStatus, { to: PlanStatus; label: string; capability: Capability }>> = {
  Proposed: { to: 'Approved for Testing', label: 'Approve for testing', capability: 'plan:approve' },
  'Approved for Testing': { to: 'Scheduled', label: 'Schedule test', capability: 'plan:schedule' },
  Scheduled: { to: 'In Progress', label: 'Start test', capability: 'plan:execute' },
}

type SortKey = 'plannedDate' | 'status' | 'id'

export function TestingPlanView() {
  const { state, actions, role, user } = useApp()
  const [workflow, setWorkflow] = useState<WorkflowId>(state.workflow)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'plannedDate', dir: 'asc' })
  const [assign, setAssign] = useState<string | null>(null)
  const [edit, setEdit] = useState<string | null>(null)
  const [results, setResults] = useState<string | null>(null)
  const [support, setSupport] = useState<string | null>(null)
  const [cancel, setCancel] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const inWorkflow = useMemo(() => state.plan.filter((p) => p.workflow === workflow), [state.plan, workflow])
  const rows = useMemo(() => {
    const filtered = statusFilter === 'all' ? inWorkflow : inWorkflow.filter((p) => p.status === statusFilter)
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sort.key === 'status') return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * dir || a.id.localeCompare(b.id)
      if (sort.key === 'id') return a.id.localeCompare(b.id) * dir
      return (a.plannedDate.localeCompare(b.plannedDate) || a.id.localeCompare(b.id)) * dir
    })
  }, [inWorkflow, statusFilter, sort])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    inWorkflow.forEach((p) => (c[p.status] = (c[p.status] ?? 0) + 1))
    return c
  }, [inWorkflow])
  const unassigned = inWorkflow.filter((p) => !p.assigneeId && p.status !== 'Completed' && p.status !== 'Cancelled').length
  const byId = (id: string | null) => (id ? state.plan.find((p) => p.id === id) ?? null : null)

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const formulationOf = (id: string) => state.formulations.find((f) => f.id === id)
  const canExecute = (p: TestingPlanItem) => can(role, 'plan:execute') && (role !== 'technician' || p.assigneeId === user.id)
  const allowedFor = (p: TestingPlanItem, capability: Capability) => (capability === 'plan:execute' ? canExecute(p) : can(role, capability))

  const advance = (p: TestingPlanItem) => {
    const step = NEXT_STEP[p.status]
    if (!step) return
    const linked = actions.setPlanStatus(p.id, step.to)
    toast.success(`${p.id} is now ${step.to}`, linked ? { description: `Linked experiment ${linked}` } : undefined)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Planning"
        title="Testing Plan"
        description="Approve, assign and schedule tests, then record the results. Recording results creates or updates the experiment record."
        actions={
          <>
            <Tabs value={workflow} onValueChange={(v) => { setWorkflow(v as WorkflowId); setStatusFilter('all') }}>
              <TabsList aria-label="Workflow">
                <TabsTrigger value="demulsifier">Oilfield demulsifiers</TabsTrigger>
                <TabsTrigger value="gasoline">Gasoline blending</TabsTrigger>
              </TabsList>
            </Tabs>
            <GatedButton allowed={can(role, 'plan:create')} capability="plan:create" onClick={() => setAdding(true)}>
              <PlusIcon data-icon="inline-start" />
              Add planned experiment
            </GatedButton>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Awaiting approval" value={counts['Proposed'] ?? 0} />
        <SummaryTile label="Scheduled" value={(counts['Approved for Testing'] ?? 0) + (counts['Scheduled'] ?? 0)} hint="Approved or scheduled" />
        <SummaryTile label="In progress" value={counts['In Progress'] ?? 0} />
        <SummaryTile label="Without a technician" value={unassigned} hint="Open tests only" />
      </div>

      <Notice tone="blue" title="Every test needs an explicit decision" className="mb-5">
        A proposed test is never run automatically. Approval, scheduling and execution are separate steps, each limited to the roles that hold that responsibility.
      </Notice>

      <Panel
        title="Planned tests"
        description={`${plural(rows.length, 'test')} shown${statusFilter === 'all' ? '' : ` with status ${statusFilter}`}`}
        action={
          <AppSelect
            value={statusFilter}
            onChange={setStatusFilter}
            aria-label="Filter by status"
            className="w-48"
            options={[{ value: 'all', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: s }))]}
          />
        }
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyNote title="No planned tests match" action={statusFilter !== 'all' ? <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>Show all statuses</Button> : undefined}>
              Add a planned experiment or accept a recommendation to start the plan.
            </EmptyNote>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Plan" active={sort.key === 'id'} dir={sort.dir} onSort={() => toggleSort('id')} />
                <TableHead>Proposed experiment</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Technician</TableHead>
                <SortHead label="Planned date" active={sort.key === 'plannedDate'} dir={sort.dir} onSort={() => toggleSort('plannedDate')} />
                <SortHead label="Status" active={sort.key === 'status'} dir={sort.dir} onSort={() => toggleSort('status')} />
                <TableHead>Supporting</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const f = formulationOf(p.formulationId)
                const assignee = p.assigneeId ? state.users.find((u) => u.id === p.assigneeId) : undefined
                const step = NEXT_STEP[p.status]
                const closed = p.status === 'Completed' || p.status === 'Cancelled'
                return (
                  <TableRow key={p.id}>
                    <TableCell className="tnum font-medium">{p.id}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium leading-snug text-ink">{p.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <FormulationChip id={p.formulationId} color={f?.color} />
                          {p.experimentId ? (
                            <span>
                              Experiment <ExpLink id={p.experimentId} />
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm">
                      <span className="tnum">
                        <Val v={p.dosagePpm} unit="ppm" />
                        {p.workflow === 'demulsifier' ? (
                          <span className="text-muted-foreground">
                            {' · '}
                            {p.crudeId}
                            {' · '}
                            <Val v={p.tempC} unit="°C" />
                            {' · '}
                            <Val v={p.settlingMin} unit="min" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{p.blendId ? ` · ${p.blendId}` : ''}</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {assignee ? (
                        <button
                          type="button"
                          className="rounded-md text-left outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none"
                          disabled={!can(role, 'plan:assign') || closed}
                          onClick={() => setAssign(p.id)}
                          aria-label={`Technician ${assignee.name}. Change assignment`}
                        >
                          <TechnicianRow user={assignee} className="px-1 py-0.5" />
                        </button>
                      ) : (
                        <span className="text-xs italic text-subtle">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="tnum whitespace-nowrap text-sm">{fmtDate(p.plannedDate)}</TableCell>
                    <TableCell>
                      <StatusPill status={p.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="xs" onClick={() => setSupport(p.id)} disabled={p.supportingExperimentIds.length === 0}>
                        {p.supportingExperimentIds.length ? plural(p.supportingExperimentIds.length, 'test') : 'None'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {step && allowedFor(p, step.capability) ? (
                          <Button size="xs" variant="outline" onClick={() => advance(p)}>
                            {step.label}
                          </Button>
                        ) : null}
                        {p.status === 'In Progress' && canExecute(p) ? (
                          <Button size="xs" onClick={() => setResults(p.id)}>
                            Enter results
                          </Button>
                        ) : null}
                        <RowMenu
                          item={p}
                          closed={closed}
                          onAssign={() => setAssign(p.id)}
                          onEdit={() => setEdit(p.id)}
                          onResults={() => setResults(p.id)}
                          onSupport={() => setSupport(p.id)}
                          onCancel={() => setCancel(p.id)}
                          canAssign={can(role, 'plan:assign')}
                          canEdit={can(role, 'plan:create') || can(role, 'plan:schedule')}
                          canResults={canExecute(p)}
                          canCancel={can(role, 'plan:cancel')}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <p className="pt-3 text-xs text-muted-foreground">
        Looking for ideas? <Link href="/recommendations" className="inline-flex min-h-6 items-center rounded font-semibold text-teal-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Review next-test recommendations</Link>.
      </p>

      <AssignDialog item={byId(assign)} onClose={() => setAssign(null)} />
      <EditPlanDialog item={byId(edit)} onClose={() => setEdit(null)} />
      <ResultsDialog item={byId(results)} onClose={() => setResults(null)} />
      <SupportDialog item={byId(support)} onClose={() => setSupport(null)} />
      <CancelPlanDialog item={byId(cancel)} onClose={() => setCancel(null)} />
      <AddPlanDialog open={adding} workflow={workflow} onClose={() => setAdding(false)} />
    </div>
  )
}

function SummaryTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="panel flex min-h-28 flex-col gap-0.5 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-2 font-heading text-[1.85rem] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-auto pt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function SortHead({ label, active, dir, onSort }: { label: string; active: boolean; dir: 'asc' | 'desc'; onSort: () => void }) {
  const Icon = dir === 'asc' ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={onSort} className="-mx-2 inline-flex min-h-8 items-center gap-1 rounded-md px-2 font-semibold outline-offset-1 hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ring">
        {label}
        {active ? <Icon className="size-3.5" aria-hidden /> : null}
      </button>
    </TableHead>
  )
}

function RowMenu({
  item,
  closed,
  onAssign,
  onEdit,
  onResults,
  onSupport,
  onCancel,
  canAssign,
  canEdit,
  canResults,
  canCancel,
}: {
  item: TestingPlanItem
  closed: boolean
  onAssign: () => void
  onEdit: () => void
  onResults: () => void
  onSupport: () => void
  onCancel: () => void
  canAssign: boolean
  canEdit: boolean
  canResults: boolean
  canCancel: boolean
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.id}`} />}>
            <EllipsisIcon />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={closed || !canAssign} onClick={onAssign}>
            <UserRoundPlusIcon />
            {item.assigneeId ? 'Reassign technician' : 'Assign technician'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={closed || !canEdit} onClick={onEdit}>
            <PencilLineIcon />
            Edit planned test
          </DropdownMenuItem>
          <DropdownMenuItem disabled={closed || !canResults || item.status === 'Proposed'} onClick={onResults}>
            <ClipboardPenLineIcon />
            Enter results
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSupport} disabled={item.supportingExperimentIds.length === 0}>
            <ListChecksIcon />
            View supporting tests
          </DropdownMenuItem>
          {item.experimentId ? (
            <DropdownMenuItem render={<Link href={`/experiments/${item.experimentId}`} />}>
              <FlaskConicalIcon />
              Open experiment
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={closed || !canCancel} onClick={onCancel}>
            <CircleSlashIcon />
            Cancel planned test
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

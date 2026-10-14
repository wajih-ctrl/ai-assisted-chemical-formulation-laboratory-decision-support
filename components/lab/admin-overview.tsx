'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DatabaseIcon, FlaskConicalIcon, PencilIcon, RotateCcwIcon, Settings2Icon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { can } from '@/lib/roles'
import { useApp } from '@/lib/store'
import type { DataField, HistoricalDataset } from '@/lib/types'
import { GatedButton, Notice, PageHeader, Panel, Pill } from './primitives'

const emptyDataset = (): HistoricalDataset => ({
  id: '',
  name: '',
  workflow: 'demulsifier',
  rows: 0,
  description: '',
  importedAt: '2026-10-13',
  source: '',
})

export function AdminOverview() {
  const { state, actions, role } = useApp()
  const allowed = can(role, 'admin:manage')
  const [datasetDraft, setDatasetDraft] = useState<HistoricalDataset | null>(null)
  const [fieldDraft, setFieldDraft] = useState<DataField | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  const counts = useMemo(
    () => [
      { label: 'Laboratory users', value: state.users.length, detail: `${state.users.filter((u) => u.status === 'Active').length} active`, icon: UsersIcon },
      { label: 'Formulations', value: state.formulations.length, detail: `${state.categories.filter((c) => c.active).length} enabled categories`, icon: FlaskConicalIcon },
      { label: 'Demo datasets', value: state.datasets.length, detail: `${state.datasets.reduce((n, d) => n + d.rows, 0)} declared rows`, icon: DatabaseIcon },
      { label: 'Experiment templates', value: state.templates.length, detail: `${state.dataFields.length} configured fields`, icon: Settings2Icon },
    ],
    [state],
  )

  const saveDataset = () => {
    if (!datasetDraft || !datasetDraft.id.trim() || !datasetDraft.name.trim()) return
    actions.upsertDataset({ ...datasetDraft, id: datasetDraft.id.trim().toUpperCase(), name: datasetDraft.name.trim() })
    toast(`${datasetDraft.id.trim().toUpperCase()} saved`)
    setDatasetDraft(null)
  }

  const saveField = () => {
    if (!fieldDraft || !fieldDraft.label.trim() || fieldDraft.locked) return
    actions.updateDataField(fieldDraft.key, { label: fieldDraft.label.trim(), description: fieldDraft.description.trim() })
    toast(`${fieldDraft.key} updated`)
    setFieldDraft(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Prototype configuration"
        description="Manage the mock users, chemical catalog, experiment templates, field labels and preloaded datasets used in this browser session."
        actions={
          <GatedButton
            allowed={allowed}
            capability="admin:manage"
            variant="outline"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcwIcon data-icon="inline-start" /> Reset demo data
          </GatedButton>
        }
      />

      <Notice tone="amber" className="mb-5" title="Session-only administration">
        These controls change illustrative data in this browser session only. There is no backend, account directory, database or production configuration service.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="panel group flex min-h-32 items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"><Icon className="size-5" /></span>
            <div><p className="tnum font-heading text-[1.85rem] font-semibold leading-none tracking-tight text-ink">{value}</p><p className="mt-2 text-sm font-semibold text-ink">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Demo datasets"
            description="Metadata for the preloaded historical records. Editing does not upload or replace laboratory files."
            action={<GatedButton allowed={allowed} capability="admin:manage" size="sm" onClick={() => setDatasetDraft(emptyDataset())}>Add demo dataset</GatedButton>}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Dataset</TableHead><TableHead>Workflow</TableHead><TableHead className="text-right">Rows</TableHead><TableHead>Imported</TableHead><TableHead className="w-16"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {state.datasets.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell><p className="font-medium text-ink">{d.name}</p><p className="tnum text-xs text-muted-foreground">{d.id} · {d.source}</p></TableCell>
                      <TableCell><Pill tone={d.workflow === 'demulsifier' ? 'teal' : 'blue'}>{d.workflow === 'demulsifier' ? 'Demulsifier' : 'Gasoline'}</Pill></TableCell>
                      <TableCell className="tnum text-right">{d.rows}</TableCell>
                      <TableCell>{fmtDate(d.importedAt)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.name}`} onClick={() => setDatasetDraft({ ...d })} disabled={!allowed}><PencilIcon /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel title="Experiment templates" description="Choose which fields appear in each mock entry template and which are required.">
            <div className="grid gap-4 lg:grid-cols-2">
              {state.templates.map((t) => (
                <section key={t.id} className="rounded-lg border">
                  <div className="border-b px-3 py-2.5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-ink">{t.title}</h3><Pill tone={t.workflow === 'demulsifier' ? 'teal' : 'blue'}>{t.id}</Pill></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p></div>
                  <div className="divide-y">
                    {t.fields.map((field) => (
                      <div key={field.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0"><p className="truncate text-sm text-ink">{field.label}</p><p className="tnum text-[11px] text-muted-foreground">{field.key}{field.unit ? ` · ${field.unit}` : ''}</p></div>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Switch size="sm" checked={field.enabled} disabled={!allowed} onCheckedChange={(enabled) => actions.updateTemplate({ ...t, fields: t.fields.map((f) => f.key === field.key ? { ...f, enabled, required: enabled ? f.required : false } : f) })} /> Enabled</label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Switch size="sm" checked={field.required} disabled={!allowed || !field.enabled} onCheckedChange={(required) => actions.updateTemplate({ ...t, fields: t.fields.map((f) => f.key === field.key ? { ...f, required } : f) })} /> Required</label>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Panel>

          <Panel title="Laboratory data fields" description="Units are locked where silent changes could misrepresent the historical records." bodyClassName="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Workflow</TableHead><TableHead>Unit</TableHead><TableHead>Control</TableHead><TableHead className="w-16"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>{state.dataFields.map((f) => <TableRow key={f.key}><TableCell><p className="font-medium text-ink">{f.label}</p><p className="tnum text-xs text-muted-foreground">{f.key}</p></TableCell><TableCell className="capitalize">{f.workflow}</TableCell><TableCell className="tnum">{f.unit}</TableCell><TableCell><Pill tone={f.locked ? 'slate' : 'green'}>{f.locked ? 'Locked unit' : 'Label editable'}</Pill></TableCell><TableCell><Button variant="ghost" size="icon-sm" aria-label={`Edit ${f.label}`} onClick={() => setFieldDraft({ ...f })} disabled={!allowed || f.locked}><PencilIcon /></Button></TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Management areas" description="Open dedicated controls for people and chemistry records.">
            <div className="grid gap-2">
              <Button variant="outline" className="h-auto justify-start gap-3 p-3 text-left" render={<Link href="/admin/chemicals" />}><FlaskConicalIcon className="size-5 text-teal" /><span><span className="block font-medium text-ink">Chemical management</span><span className="block text-xs font-normal text-muted-foreground">Categories and formulations</span></span></Button>
              <Button variant="outline" className="h-auto justify-start gap-3 p-3 text-left" render={<Link href="/admin/users" />}><UsersIcon className="size-5 text-blue" /><span><span className="block font-medium text-ink">User management</span><span className="block text-xs font-normal text-muted-foreground">Roles, laboratory areas and status</span></span></Button>
              <Button variant="outline" className="h-auto justify-start gap-3 p-3 text-left" render={<Link href="/data/upload" />}><DatabaseIcon className="size-5 text-amber" /><span><span className="block font-medium text-ink">Historical data import</span><span className="block text-xs font-normal text-muted-foreground">Run the simulated upload and mapping flow</span></span></Button>
            </div>
          </Panel>

          <Panel title="Recent simulated system activity" description="Configuration and laboratory events in the current mock session.">
            <ol className="divide-y">
              {state.activity.slice(0, 8).map((event) => {
                const actor = state.users.find((u) => u.id === event.actorId)
                return <li key={event.id} className="py-3 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><p className="text-sm leading-relaxed text-ink">{event.text}</p><Pill tone={event.type.includes('changed') ? 'amber' : 'slate'}>{event.type.replaceAll('-', ' ')}</Pill></div><p className="mt-1 text-xs text-muted-foreground">{actor?.name ?? event.actorId} · {fmtDateTime(event.at)}</p></li>
              })}
            </ol>
          </Panel>
        </div>
      </div>

      <Dialog open={datasetDraft !== null} onOpenChange={(open) => !open && setDatasetDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{datasetDraft?.id ? 'Edit demo dataset' : 'Add demo dataset'}</DialogTitle><DialogDescription>Metadata only. No file is uploaded and no laboratory records are changed.</DialogDescription></DialogHeader>
          {datasetDraft ? <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="ds-id">Dataset ID</Label><Input id="ds-id" value={datasetDraft.id} disabled={state.datasets.some((d) => d.id === datasetDraft.id)} onChange={(e) => setDatasetDraft({ ...datasetDraft, id: e.target.value })} placeholder="DS-004" /></div><div className="grid gap-1.5"><Label htmlFor="ds-rows">Declared rows</Label><Input id="ds-rows" type="number" min={0} value={datasetDraft.rows} onChange={(e) => setDatasetDraft({ ...datasetDraft, rows: Math.max(0, Number(e.target.value)) })} /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ds-name">Name</Label><Input id="ds-name" value={datasetDraft.name} onChange={(e) => setDatasetDraft({ ...datasetDraft, name: e.target.value })} /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ds-source">Illustrative source filename</Label><Input id="ds-source" value={datasetDraft.source} onChange={(e) => setDatasetDraft({ ...datasetDraft, source: e.target.value })} placeholder="screening_results.csv" /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ds-description">Description</Label><Textarea id="ds-description" rows={3} value={datasetDraft.description} onChange={(e) => setDatasetDraft({ ...datasetDraft, description: e.target.value })} /></div></div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setDatasetDraft(null)}>Cancel</Button><Button onClick={saveDataset} disabled={!datasetDraft?.id.trim() || !datasetDraft?.name.trim()}>Save metadata</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldDraft !== null} onOpenChange={(open) => !open && setFieldDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit data field</DialogTitle><DialogDescription>The internal key and unit remain fixed; only display text can be changed.</DialogDescription></DialogHeader>
          {fieldDraft ? <div className="grid gap-3"><div className="grid gap-1.5"><Label htmlFor="field-label">Display label</Label><Input id="field-label" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="field-description">Description</Label><Textarea id="field-description" rows={3} value={fieldDraft.description} onChange={(e) => setFieldDraft({ ...fieldDraft, description: e.target.value })} /></div></div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setFieldDraft(null)}>Cancel</Button><Button onClick={saveField} disabled={!fieldDraft?.label.trim()}>Save field</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset all demo changes?</DialogTitle><DialogDescription>This restores the original illustrative datasets, experiments, plans, users and configuration for this browser. Changes made during this session will be removed.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setResetOpen(false)}>Keep my changes</Button><Button variant="destructive" onClick={() => { actions.resetDemo(); setResetOpen(false); toast.success('Demo data restored to its original seeded state') }}>Reset demo data</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

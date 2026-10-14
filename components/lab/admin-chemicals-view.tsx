'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { can } from '@/lib/roles'
import { useApp } from '@/lib/store'
import type { ChemicalCategory, Formulation } from '@/lib/types'
import { AppSelect } from './pickers'
import { GatedButton, Notice, PageHeader, Panel, Pill } from './primitives'

const newFormulation = (categoryId: string): Formulation => ({ id: '', name: '', categoryId, description: '', status: 'Under Evaluation', color: '#087f83' })
const newCategory = (): ChemicalCategory => ({ id: '', name: '', workflow: 'demulsifier', description: '', active: true })

export function AdminChemicalsView() {
  const { state, actions, role } = useApp()
  const allowed = can(role, 'admin:manage')
  const [query, setQuery] = useState('')
  const [formulation, setFormulation] = useState<Formulation | null>(null)
  const [category, setCategory] = useState<ChemicalCategory | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.formulations.filter((f) => !q || `${f.id} ${f.name} ${f.description}`.toLowerCase().includes(q))
  }, [query, state.formulations])

  const saveFormulation = () => {
    if (!formulation || !formulation.id.trim() || !formulation.name.trim() || !formulation.categoryId) return
    actions.upsertFormulation({ ...formulation, id: formulation.id.trim().toUpperCase(), name: formulation.name.trim() })
    toast(`${formulation.id.trim().toUpperCase()} saved`)
    setFormulation(null)
  }
  const saveCategory = () => {
    if (!category || !category.id.trim() || !category.name.trim()) return
    actions.upsertCategory({ ...category, id: category.id.trim().toLowerCase(), name: category.name.trim() })
    toast(`${category.name.trim()} saved`)
    setCategory(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration · Chemicals"
        title="Chemical categories and formulations"
        description="Maintain the illustrative formulation catalog used by comparisons, experiment entry and analytical views."
        actions={<><GatedButton allowed={allowed} capability="admin:manage" variant="outline" onClick={() => setCategory(newCategory())}><PlusIcon data-icon="inline-start" /> Add category</GatedButton><GatedButton allowed={allowed} capability="admin:manage" onClick={() => setFormulation(newFormulation(state.categories[0]?.id ?? ''))}><PlusIcon data-icon="inline-start" /> Add formulation</GatedButton></>}
      />
      <Notice tone="blue" className="mb-5">Catalog edits affect this mock session only and do not represent approved chemical identities, specifications or product master data.</Notice>

      <Panel title="Chemical categories" description="Inactive categories remain visible to administrators but are not treated as available workflows.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.categories.map((c) => {
            const count = state.formulations.filter((f) => f.categoryId === c.id).length
            return <section key={c.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-ink">{c.name}</h3><Pill tone={c.workflow === 'demulsifier' ? 'teal' : 'blue'}>{c.workflow}</Pill></div><p className="tnum mt-1 text-xs text-muted-foreground">{c.id} · {count} formulations</p></div><Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setCategory({ ...c })} disabled={!allowed}><PencilIcon /></Button></div><p className="mt-3 min-h-10 text-xs leading-relaxed text-muted-foreground">{c.description}</p><label className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><span>{c.active ? 'Enabled' : 'Inactive'}</span><Switch checked={c.active} disabled={!allowed} onCheckedChange={(active) => actions.upsertCategory({ ...c, active })} /></label></section>
          })}
        </div>
      </Panel>

      <Panel className="mt-5" title="Formulation catalog" description={`${filtered.length} of ${state.formulations.length} mock formulations shown`} action={<div className="relative"><SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search formulations" className="w-64 pl-8" aria-label="Search formulations" /></div>} bodyClassName="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Formulation</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Description</TableHead><TableHead className="w-16"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((f) => { const c = state.categories.find((x) => x.id === f.categoryId); return <TableRow key={f.id}><TableCell><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ backgroundColor: f.color }} /><div><p className="tnum font-semibold text-ink">{f.id}</p><p className="text-xs text-muted-foreground">{f.name}</p></div></div></TableCell><TableCell>{c?.name ?? f.categoryId}</TableCell><TableCell><Pill tone={f.status === 'Active' ? 'green' : f.status === 'Archived' ? 'slate' : 'amber'}>{f.status}</Pill></TableCell><TableCell className="max-w-md whitespace-normal text-xs leading-relaxed text-muted-foreground">{f.description}</TableCell><TableCell><Button variant="ghost" size="icon-sm" aria-label={`Edit ${f.id}`} onClick={() => setFormulation({ ...f })} disabled={!allowed}><PencilIcon /></Button></TableCell></TableRow> })}</TableBody>
        </Table>
      </Panel>

      <Dialog open={formulation !== null} onOpenChange={(open) => !open && setFormulation(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{state.formulations.some((f) => f.id === formulation?.id) ? 'Edit formulation' : 'Add formulation'}</DialogTitle><DialogDescription>Define a mock formulation record for use throughout the prototype.</DialogDescription></DialogHeader>{formulation ? <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="form-id">Formulation ID</Label><Input id="form-id" value={formulation.id} disabled={state.formulations.some((f) => f.id === formulation.id)} onChange={(e) => setFormulation({ ...formulation, id: e.target.value })} placeholder="DM-F610" /></div><div className="grid gap-1.5"><Label htmlFor="form-color">Chart color</Label><Input id="form-color" type="color" value={formulation.color} onChange={(e) => setFormulation({ ...formulation, color: e.target.value })} className="p-1" /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="form-name">Name</Label><Input id="form-name" value={formulation.name} onChange={(e) => setFormulation({ ...formulation, name: e.target.value })} /></div><div className="grid gap-1.5"><Label>Category</Label><AppSelect value={formulation.categoryId} onChange={(categoryId) => setFormulation({ ...formulation, categoryId })} options={state.categories.map((c) => ({ value: c.id, label: c.name }))} /></div><div className="grid gap-1.5"><Label>Status</Label><AppSelect value={formulation.status} onChange={(status) => setFormulation({ ...formulation, status: status as Formulation['status'] })} options={['Active', 'Under Evaluation', 'Archived'].map((value) => ({ value, label: value }))} /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="form-description">Description</Label><Textarea id="form-description" rows={3} value={formulation.description} onChange={(e) => setFormulation({ ...formulation, description: e.target.value })} /></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setFormulation(null)}>Cancel</Button><Button onClick={saveFormulation} disabled={!formulation?.id.trim() || !formulation?.name.trim() || !formulation?.categoryId}>Save formulation</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={category !== null} onOpenChange={(open) => !open && setCategory(null)}>
        <DialogContent><DialogHeader><DialogTitle>{state.categories.some((c) => c.id === category?.id) ? 'Edit category' : 'Add category'}</DialogTitle><DialogDescription>Categories group mock formulations by laboratory workflow.</DialogDescription></DialogHeader>{category ? <div className="grid gap-3"><div className="grid gap-1.5"><Label htmlFor="cat-id">Category ID</Label><Input id="cat-id" value={category.id} disabled={state.categories.some((c) => c.id === category.id)} onChange={(e) => setCategory({ ...category, id: e.target.value })} placeholder="cat-new" /></div><div className="grid gap-1.5"><Label htmlFor="cat-name">Name</Label><Input id="cat-name" value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} /></div><div className="grid gap-1.5"><Label>Workflow</Label><AppSelect value={category.workflow} onChange={(workflow) => setCategory({ ...category, workflow: workflow as ChemicalCategory['workflow'] })} options={[{ value: 'demulsifier', label: 'Oilfield / demulsifier' }, { value: 'gasoline', label: 'Gasoline blending' }]} /></div><div className="grid gap-1.5"><Label htmlFor="cat-description">Description</Label><Textarea id="cat-description" rows={3} value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })} /></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setCategory(null)}>Cancel</Button><Button onClick={saveCategory} disabled={!category?.id.trim() || !category?.name.trim()}>Save category</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  )
}

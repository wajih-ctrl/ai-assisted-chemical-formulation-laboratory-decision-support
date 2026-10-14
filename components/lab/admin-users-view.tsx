'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDateTime, initials } from '@/lib/format'
import { can, ROLE_LABEL, ROLES } from '@/lib/roles'
import { useApp } from '@/lib/store'
import type { RoleId, User } from '@/lib/types'
import { AppSelect } from './pickers'
import { GatedButton, Notice, PageHeader, Panel, Pill } from './primitives'

function emptyUser(existing: User[]): User {
  const nums = existing.map((u) => Number(u.id.match(/(\d+)$/)?.[1] ?? 0))
  return { id: `usr-demo${Math.max(0, ...nums) + 1}`, name: '', email: '', role: 'technician', area: '', status: 'Active', lastActivity: '2026-10-13T09:00:00' }
}

export function AdminUsersView() {
  const { state, actions, role } = useApp()
  const allowed = can(role, 'admin:manage')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | RoleId>('all')
  const [draft, setDraft] = useState<User | null>(null)
  const summary: Array<{ label: string; value: number; tone: 'green' | 'teal' | 'blue' | 'amber' }> = [
    { label: 'Active users', value: state.users.filter((u) => u.status === 'Active').length, tone: 'green' },
    { label: 'Chemists', value: state.users.filter((u) => u.role === 'chemist').length, tone: 'teal' },
    { label: 'Technicians', value: state.users.filter((u) => u.role === 'technician').length, tone: 'blue' },
    { label: 'Managers & admin', value: state.users.filter((u) => !['chemist', 'technician'].includes(u.role)).length, tone: 'amber' },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.users.filter((u) => (roleFilter === 'all' || u.role === roleFilter) && (!q || `${u.name} ${u.email} ${u.area}`.toLowerCase().includes(q)))
  }, [query, roleFilter, state.users])

  const save = () => {
    if (!draft || !draft.name.trim() || !draft.email.includes('@') || !draft.area.trim()) return
    actions.upsertUser({ ...draft, name: draft.name.trim(), email: draft.email.trim().toLowerCase(), area: draft.area.trim() })
    toast(`${draft.name.trim()} saved`)
    setDraft(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration · Users"
        title="Laboratory users and roles"
        description="Review the mock laboratory team, change demonstration roles and enable or disable session-only user records."
        actions={<GatedButton allowed={allowed} capability="admin:manage" onClick={() => setDraft(emptyUser(state.users))}><PlusIcon data-icon="inline-start" /> Add mock user</GatedButton>}
      />
      <Notice tone="amber" className="mb-5">This is not an identity or authentication system. User records and permissions are illustrative and persist only for the current browser session.</Notice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(({ label, value, tone }) => <div key={label} className="panel p-4"><Pill tone={tone}>{label}</Pill><p className="tnum mt-2 text-3xl font-semibold text-ink">{value}</p></div>)}
      </div>

      <Panel
        className="mt-5"
        title="Mock user directory"
        description={`${filtered.length} of ${state.users.length} users shown`}
        action={<div className="flex flex-wrap gap-2"><AppSelect value={roleFilter} onChange={(v) => setRoleFilter(v as 'all' | RoleId)} options={[{ value: 'all', label: 'All roles' }, ...ROLES.map((r) => ({ value: r.id, label: r.label }))]} className="w-48" aria-label="Filter by role" /><div className="relative"><SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="w-56 pl-8" aria-label="Search users" /></div></div>}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Laboratory area</TableHead><TableHead>Last activity</TableHead><TableHead>Status</TableHead><TableHead className="w-16"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((u) => <TableRow key={u.id}><TableCell><div className="flex items-center gap-2.5"><Avatar className="size-8"><AvatarFallback className="bg-teal-soft text-xs font-semibold text-teal-ink">{initials(u.name)}</AvatarFallback></Avatar><div><p className="font-medium text-ink">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div></TableCell><TableCell>{ROLE_LABEL[u.role]}</TableCell><TableCell>{u.area}</TableCell><TableCell className="tnum text-xs text-muted-foreground">{fmtDateTime(u.lastActivity)}</TableCell><TableCell><label className="flex items-center gap-2"><Switch size="sm" checked={u.status === 'Active'} disabled={!allowed || u.id === state.userId} onCheckedChange={(active) => { actions.upsertUser({ ...u, status: active ? 'Active' : 'Disabled' }); toast(`${u.name} ${active ? 'enabled' : 'disabled'}`) }} /><span className="text-xs">{u.status}</span></label></TableCell><TableCell><Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => setDraft({ ...u })} disabled={!allowed}><PencilIcon /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </Panel>

      <Panel className="mt-5" title="Role capability guide" description="Controls elsewhere remain visible when unavailable and explain which role can perform the action.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ROLES.map((r) => <article key={r.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-ink">{r.label}</h3><Pill>{state.users.filter((u) => u.role === r.id).length} users</Pill></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.description}</p><p className="mt-2 text-xs font-medium text-teal-ink">{r.focus.join(' · ')}</p></article>)}</div>
      </Panel>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{state.users.some((u) => u.id === draft?.id) ? 'Edit mock user' : 'Add mock user'}</DialogTitle><DialogDescription>Changes update the role demonstration in this session; no invitation or email is sent.</DialogDescription></DialogHeader>{draft ? <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="user-name">Name</Label><Input id="user-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="user-email">Email</Label><Input id="user-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="name@stratalab.example" /></div><div className="grid gap-1.5"><Label>Role</Label><AppSelect value={draft.role} onChange={(v) => setDraft({ ...draft, role: v as RoleId })} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} /></div><div className="grid gap-1.5"><Label>Status</Label><AppSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as User['status'] })} options={[{ value: 'Active', label: 'Active' }, { value: 'Disabled', label: 'Disabled' }]} /></div><div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="user-area">Laboratory area</Label><Input id="user-area" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="Demulsifier Laboratory" /></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={save} disabled={!draft?.name.trim() || !draft?.email.includes('@') || !draft?.area.trim()}>Save user</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  )
}

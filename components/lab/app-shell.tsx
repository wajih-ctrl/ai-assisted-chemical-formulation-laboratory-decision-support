'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIcon,
  BeakerIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  ClipboardListIcon,
  Columns2Icon,
  FileTextIcon,
  FlaskConicalIcon,
  FuelIcon,
  LayoutDashboardIcon,
  MenuIcon,
  PlusIcon,
  RotateCcwIcon,
  RouteIcon,
  ScanSearchIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TestTubesIcon,
  UploadIcon,
  UsersIcon,
  LineChartIcon,
  LogOutIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from '@/components/ui/command'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import { roleDefaultUser } from '@/lib/seed'
import { NAV, ROLES, ROLE_LABEL } from '@/lib/roles'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { WorkflowId } from '@/lib/types'
import { AppSelect } from './pickers'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  layout: LayoutDashboardIcon,
  flask: FlaskConicalIcon,
  'test-tubes': TestTubesIcon,
  upload: UploadIcon,
  plus: PlusIcon,
  chart: LineChartIcon,
  columns: Columns2Icon,
  activity: ActivityIcon,
  lens: ScanSearchIcon,
  route: RouteIcon,
  clipboard: ClipboardListIcon,
  fuel: FuelIcon,
  file: FileTextIcon,
  shield: ShieldCheckIcon,
  beaker: BeakerIcon,
  users: UsersIcon,
}

function isActive(pathname: string, href: string, all: string[]): boolean {
  if (pathname === href) return true
  if (href === '/experiments' && pathname.startsWith('/experiments/') && pathname !== '/experiments/new') return true
  if (href === '/admin') return false
  // longest-prefix match so /experiments/new does not highlight /experiments
  return pathname.startsWith(href + '/') && !all.some((o) => o !== href && o.length > href.length && (pathname === o || pathname.startsWith(o + '/')))
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { role } = useApp()
  const allHrefs = NAV.flatMap((g) => g.items.map((i) => i.href))
  return (
    <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3 scroll-thin">
      {NAV.map((group) => {
        const items = group.items.filter((i) => i.roles.includes(role))
        if (!items.length) return null
        return (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/75">{group.label}</p>
            {items.map((item) => {
              const Icon = ICONS[item.icon] ?? FlaskConicalIcon
              const active = isActive(pathname, item.href, allHrefs)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground outline-none transition-all duration-200 hover:bg-white/10 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
                    active && 'bg-gradient-to-r from-sidebar-primary/20 to-sidebar-accent text-white shadow-[inset_0_0_0_1px_rgb(66_210_196/0.16)] before:absolute before:left-0 before:h-5 before:w-[3px] before:rounded-full before:bg-sidebar-primary',
                  )}
                >
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/10', active && 'bg-sidebar-primary/15')}>
                    <Icon className={cn('size-4 text-sidebar-foreground/90 group-hover:text-sidebar-primary', active && 'text-sidebar-primary')} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
      <span className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-[#5f9df7] text-sidebar-primary-foreground shadow-[0_8px_24px_rgb(66_210_196/0.24)]">
        <FlaskConicalIcon className="size-5" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-white" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-[17px] font-semibold tracking-[-0.03em] text-white">StrataLab</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-sidebar-foreground/80">Lab intelligence</span>
      </span>
    </Link>
  )
}

function SidebarFooter() {
  return (
    <div className="m-3 mt-1 rounded-xl border border-sidebar-border bg-white/[0.035] p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><ShieldCheckIcon className="size-4" /></span>
        <p className="text-xs leading-relaxed text-sidebar-foreground/90">
          Illustrative prototype data. Not scientifically validated.
        </p>
      </div>
    </div>
  )
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const router = useRouter()
  const { state } = useApp()
  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search experiments, formulations and pages">
      <Command>
        <CommandInput placeholder="Search experiments, formulations, pages" />
        <CommandList>
          <CommandEmpty>No matching records.</CommandEmpty>
          <CommandGroup heading="Pages">
            {NAV.flatMap((g) => g.items)
              .filter((i) => i.roles.includes(state.roleId))
              .map((i) => (
                <CommandItem key={i.href} value={`page ${i.label}`} onSelect={() => go(i.href)}>
                  {i.label}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandGroup heading="Formulations">
            {state.formulations.map((f) => (
              <CommandItem key={f.id} value={`formulation ${f.id} ${f.name}`} onSelect={() => go(`/comparison?add=${f.id}`)}>
                <span className="tnum font-medium">{f.id}</span>
                <span className="text-muted-foreground">{f.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Experiments">
            {[...state.experiments, ...state.gasoline].map((e) => (
              <CommandItem
                key={e.id}
                value={`experiment ${e.id} ${'formulationId' in e ? e.formulationId : e.blendId} ${'crudeId' in e ? e.crudeId : ''}`}
                onSelect={() => go(`/experiments/${e.id}`)}
              >
                <span className="tnum font-medium">{e.id}</span>
                <span className="text-muted-foreground">
                  {'formulationId' in e ? `${e.formulationId} · ${e.crudeId}` : `${e.blendId} · ${e.boosterPpm ?? 'n/a'} ppm`}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function RoleMenu() {
  const { state, actions, user, role } = useApp()
  const router = useRouter()
  const [resetOpen, setResetOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="h-11 gap-2.5 rounded-xl px-2.5 hover:bg-white" aria-label="Open user and role menu" />}
        >
          <Avatar className="size-8 ring-2 ring-white shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-teal-soft to-blue-soft text-[11px] font-semibold text-teal-ink">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start text-left leading-tight md:flex">
            <span className="text-[13px] font-medium text-ink">{user.name}</span>
            <span className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</span>
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Switch demonstration role</DropdownMenuLabel>
            {ROLES.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => {
                  actions.login(r.id)
                  router.push('/dashboard')
                }}
                className="items-start gap-2"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{state.users.find((u) => u.id === seedUserFor(r.id))?.name}</span>
                </span>
                {r.id === role ? <CheckIcon className="mt-0.5" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setResetOpen(true)}>
              <RotateCcwIcon />
              Reset demo data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/')}>
              <LogOutIcon />
              Return to role selection
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all demo changes?</DialogTitle>
            <DialogDescription>This restores the original illustrative datasets, experiments, plans and configuration for this browser. Changes made during this session will be removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Keep my changes</Button>
            <Button variant="destructive" onClick={() => { actions.resetDemo(); setResetOpen(false); toast.success('Demo data restored') }}>Reset demo data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function seedUserFor(role: string): string {
  return roleDefaultUser[role]
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, actions, hydrated } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const workflowOptions = useMemo(
    () => [
      { value: 'demulsifier', label: 'Oilfield Demulsifiers' },
      { value: 'gasoline', label: 'Gasoline Blending Additives' },
    ],
    [],
  )

  return (
    <div className="relative flex min-h-svh bg-transparent">
      <a
        href="#main"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-3 focus:ring-sidebar-primary"
      >
        Skip to main content
      </a>
      <aside className="print-hidden fixed inset-y-4 left-4 z-30 hidden w-64 flex-col overflow-hidden rounded-[1.5rem] border border-white/5 bg-sidebar shadow-[0_24px_80px_rgb(6_16_30/0.25)] lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_40%_0%,rgb(66_210_196/0.15),transparent_65%)]" />
        <Brand />
        <SidebarNav />
        <SidebarFooter />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground data-[side=left]:sm:max-w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Primary navigation for StrataLab</SheetDescription>
          <Brand />
          <div className="border-y border-sidebar-border px-4 py-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/80" htmlFor="mobile-workflow">
              Active workflow
            </label>
            <AppSelect
              id="mobile-workflow"
              value={state.workflow}
              onChange={(v) => actions.setWorkflow(v as WorkflowId)}
              options={workflowOptions}
              className="bg-white text-ink"
            />
          </div>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <div className="print-hidden sticky top-0 z-20 flex h-[4.5rem] items-center gap-3 border-b border-border/70 bg-background/78 px-4 backdrop-blur-xl md:px-8">
          <Button variant="ghost" size="icon" className="rounded-xl lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <MenuIcon />
          </Button>
          <div className="hidden w-60 md:block">
            <AppSelect
              value={state.workflow}
              onChange={(v) => actions.setWorkflow(v as WorkflowId)}
              options={workflowOptions}
              aria-label="Chemical workflow"
              className="h-10 rounded-xl bg-white shadow-sm"
            />
          </div>
          <div className="hidden h-7 w-px bg-border lg:block" />
          <Button
            variant="outline"
            className="ml-auto h-10 min-w-0 flex-1 justify-start gap-2.5 rounded-xl border-border/80 bg-white/80 font-normal text-muted-foreground shadow-sm md:ml-0 md:max-w-sm"
            onClick={() => setSearchOpen(true)}
            aria-label="Search experiments, formulations and pages"
          >
            <SearchIcon data-icon="inline-start" />
            <span className="truncate">Search experiments</span>
            <kbd className="ml-auto hidden rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-semibold sm:inline">Ctrl K</kbd>
          </Button>
          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
            <SparklesIcon className="size-3.5 text-teal" />
            Decision-support workspace
          </div>
          <div>{hydrated ? <RoleMenu /> : <Skeleton className="h-10 w-36" />}</div>
        </div>
        <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-6 outline-none md:px-8 md:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}

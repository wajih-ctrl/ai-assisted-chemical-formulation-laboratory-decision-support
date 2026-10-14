'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { InfoIcon, LockKeyholeIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { statusTone } from '@/lib/analysis'
import { NOT_MEASURED } from '@/lib/format'
import { CAPABILITY_HINT, type Capability } from '@/lib/roles'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <header className="relative flex flex-col gap-5 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 max-w-3xl flex-col gap-2">
        {eyebrow ? <p className="eyebrow flex items-center gap-2 before:block before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary">{eyebrow}</p> : null}
        <h1 className="font-heading text-[1.85rem] font-semibold leading-[1.08] text-ink text-balance md:text-[2.2rem]">{title}</h1>
        {description ? <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty">{description}</p> : null}
        {meta ? <div className="pt-1.5">{meta}</div> : null}
      </div>
      {actions ? <div className="print-hidden flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('panel flex min-w-0 flex-col', className)}>
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/75 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? <h2 className="font-heading text-[15px] font-semibold tracking-[-0.015em] text-ink">{title}</h2> : null}
            {description ? <p className="text-[12.5px] leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('min-w-0 p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

const TONES = {
  teal: 'bg-teal-soft text-teal-ink',
  blue: 'bg-blue-soft text-blue-ink',
  amber: 'bg-amber-soft text-amber-ink',
  rust: 'bg-rust-soft text-rust-ink',
  slate: 'bg-muted text-muted-foreground',
  green: 'bg-success-soft text-success-ink',
} as const

export type Tone = keyof typeof TONES

export function Pill({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('h-6 rounded-full border border-current/10 px-2 text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </Badge>
  )
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={statusTone(status)}>{status}</Pill>
}

export function Val({ v, unit, digits = 0, className }: { v: number | null | undefined; unit?: string; digits?: number; className?: string }) {
  if (v === null || v === undefined) {
    return <span className={cn('text-xs italic text-subtle', className)}>{NOT_MEASURED}</span>
  }
  return (
    <span className={cn('tnum', className)}>
      {v.toFixed(digits)}
      {unit ? <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span> : null}
    </span>
  )
}

export function FormulationChip({ id, color, label }: { id: string; color?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? '#5b6b82' }} />
      {label ?? id}
    </span>
  )
}

export function ExpLink({ id, className }: { id: string; className?: string }) {
  return (
    <Link href={`/experiments/${id}`} className={cn('tnum inline-flex min-h-6 items-center rounded font-semibold text-teal-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', className)}>
      {id}
    </Link>
  )
}

export function KeyValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  )
}

export function Notice({ tone = 'blue', title, children, className }: { tone?: Tone; title?: string; children: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]', TONES[tone], 'border-current/10', className)}>
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/55"><InfoIcon className="size-3.5" aria-hidden /></span>
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={cn(title && 'opacity-90')}>{children}</div>
      </div>
    </div>
  )
}

export function EmptyNote({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-gradient-to-b from-muted/25 to-muted/60 px-6 py-12 text-center">
      <p className="font-heading text-[15px] font-semibold text-ink">{title}</p>
      {children ? <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

/** Button that stays visible but disabled, with the reason available on hover/focus. */
export function GatedButton({
  allowed,
  capability,
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className,
  type = 'button',
  render,
}: {
  allowed: boolean
  capability: Capability
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'xs' | 'lg'
  className?: string
  type?: 'button' | 'submit'
  render?: React.ReactElement
}) {
  if (allowed) {
    return (
      <Button type={type} variant={variant} size={size} className={className} onClick={onClick} render={render}>
        {children}
      </Button>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
        <Button type="button" variant={variant} size={size} className={cn('pointer-events-none', className)} disabled aria-disabled>
          <LockKeyholeIcon data-icon="inline-start" />
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Available to: {CAPABILITY_HINT[capability]}</TooltipContent>
    </Tooltip>
  )
}

export function Dl({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-3', className)}>{children}</dl>
}

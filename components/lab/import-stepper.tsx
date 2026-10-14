import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Select Data Source', 'Preview & Map Columns', 'Confirm Import']

export function ImportStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Import progress" className="panel mb-6 px-4 py-3">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <li key={label} aria-current={active ? 'step' : undefined} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  'tnum flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-teal-soft text-teal-ink',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? <CheckIcon className="size-3.5" aria-hidden /> : n}
              </span>
              <span className={cn('text-sm', active ? 'font-medium text-ink' : 'text-muted-foreground')}>
                {label}
                <span className="sr-only">{done ? ' (completed)' : active ? ' (current step)' : ''}</span>
              </span>
              {n < STEPS.length ? <span aria-hidden className={cn('hidden h-px flex-1 sm:block', done ? 'bg-primary' : 'bg-border')} /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

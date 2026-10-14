'use client'

import { ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
  hint?: string
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  className,
  id,
  disabled,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedBy,
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null && v !== undefined) onChange(String(v))
      }}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn('w-full', className)} aria-label={ariaLabel} aria-invalid={ariaInvalid} aria-required={ariaRequired} aria-describedby={ariaDescribedBy}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  max,
  allLabel = 'All',
  className,
}: {
  label: string
  options: Option[]
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
  allLabel?: string
  className?: string
}) {
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className={cn('w-full justify-between font-normal', className)} aria-label={`${label}: ${summary}`} />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="text-muted-foreground">{label}</span>
          <span className="truncate text-ink">{summary}</span>
        </span>
        <ChevronsUpDownIcon data-icon="inline-end" className="opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1.5">
        <div className="flex max-h-72 flex-col overflow-y-auto">
          {options.map((o) => {
            const checked = selected.includes(o.value)
            const disabled = !checked && max !== undefined && selected.length >= max
            return (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  className="mt-0.5"
                  onCheckedChange={(c) => onChange(c ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-ink">{o.label}</span>
                  {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
                </span>
              </label>
            )
          })}
        </div>
        {selected.length > 0 ? (
          <Button variant="ghost" size="sm" className="mt-1 justify-start text-muted-foreground" onClick={() => onChange([])}>
            Clear selection
          </Button>
        ) : null}
        {max !== undefined ? <p className="px-2 pb-1 pt-0.5 text-xs text-muted-foreground">Up to {max} can be selected.</p> : null}
      </PopoverContent>
    </Popover>
  )
}

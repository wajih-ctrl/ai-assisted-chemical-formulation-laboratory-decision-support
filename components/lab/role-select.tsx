'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowRightIcon,
  BeakerIcon,
  ChartNoAxesCombinedIcon,
  ClipboardCheckIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { ROLES } from '@/lib/roles'
import { roleDefaultUser } from '@/lib/seed'
import { useApp } from '@/lib/store'
import type { RoleId } from '@/lib/types'

export function RoleSelect() {
  const router = useRouter()
  const { state, actions } = useApp()

  const choose = (role: RoleId) => {
    actions.login(role)
    router.push(role === 'technician' ? '/testing-plan' : role === 'admin' ? '/admin' : '/dashboard')
  }

  const roleIcons: Record<RoleId, LucideIcon> = {
    chemist: BeakerIcon,
    technician: ClipboardCheckIcon,
    'lab-manager': UsersIcon,
    'rd-manager': ChartNoAxesCombinedIcon,
    'tech-manager': Settings2Icon,
    admin: ShieldCheckIcon,
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {ROLES.map((r) => {
        const user = state.users.find((u) => u.id === roleDefaultUser[r.id])
        const Icon = roleIcons[r.id]
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => choose(r.id)}
              className="group relative flex h-full min-h-0 w-full flex-row gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-[0_8px_30px_-24px_rgba(16,28,46,0.5)] outline-none transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_18px_35px_-22px_rgba(8,119,111,0.45)] focus-visible:ring-3 focus-visible:ring-ring/55 focus-visible:ring-offset-2 sm:min-h-44 sm:flex-col sm:gap-0"
            >
              <span className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" aria-hidden />
              <span className="relative flex w-auto shrink-0 items-start sm:w-full">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
              </span>
              <span className="relative flex min-w-0 flex-1 flex-col pr-5 sm:mt-4 sm:pr-0">
                <span className="font-heading text-[15px] font-semibold text-ink">{r.label}</span>
                <span className="mt-0.5 text-xs font-medium text-primary">{r.tagline}</span>
                <span className="mt-2 line-clamp-1 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">{r.description}</span>
                <span className="mt-auto pt-3 text-[11px] text-subtle">Continue as {user?.name}</span>
              </span>
              <ArrowRightIcon className="absolute right-4 top-4 size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

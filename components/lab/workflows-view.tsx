'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { ArrowRightIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { fmtDate, plural } from '@/lib/format'
import type { WorkflowId } from '@/lib/types'
import { FormulationChip, Notice, PageHeader, Pill } from './primitives'

function ParamList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((p) => (
        <li key={p} className="tnum rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
          {p}
        </li>
      ))}
    </ul>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  )
}

function Bottle({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  const water = pct ?? 0
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={pct === null ? `${label}: no result recorded` : `${label}: ${pct} percent water separated`}
        className="relative h-36 w-12 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-border bg-background shadow-inner"
      >
        <div className="absolute inset-x-0 top-0 bg-amber-soft" style={{ height: `${100 - water}%` }} />
        <div className="absolute inset-x-0 bottom-0 bg-blue-soft" style={{ height: `${water}%` }} />
        {[25, 50, 75].map((t) => (
          <span key={t} aria-hidden className="absolute left-0 h-px w-2 bg-border" style={{ bottom: `${t}%` }} />
        ))}
        <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-foreground/30" style={{ bottom: `${water}%` }} />
      </div>
      <figcaption className="flex flex-col items-center gap-0.5">
        <FormulationChip id={label} color={color} />
        <span className="tnum text-xs text-muted-foreground">{pct === null ? 'No result' : `${pct} %`}</span>
      </figcaption>
    </figure>
  )
}

export function WorkflowsView() {
  const { state, actions } = useApp()
  const router = useRouter()

  const dem = useMemo(() => {
    const fs = state.formulations.filter((f) => state.categories.find((c) => c.id === f.categoryId)?.workflow === 'demulsifier')
    const done = state.experiments.filter((e) => e.waterSepPct !== null)
    const bottles = fs.slice(0, 4).map((f) => {
      const vals = done.filter((e) => e.formulationId === f.id).map((e) => e.waterSepPct as number)
      return { f, best: vals.length ? Math.max(...vals) : null }
    })
    const latest = [...state.experiments].sort((a, b) => b.testDate.localeCompare(a.testDate) || b.id.localeCompare(a.id))[0]
    return { fs, bottles, latest, total: state.experiments.length, recent: state.experiments.filter((e) => e.testDate >= '2026-09-01').length }
  }, [state])

  const gas = useMemo(() => {
    const rons = state.gasoline.map((e) => e.ron).filter((r): r is number => r !== null)
    return {
      total: state.gasoline.length,
      measured: rons.length,
      min: rons.length ? Math.min(...rons) : null,
      max: rons.length ? Math.max(...rons) : null,
      blends: state.blends,
    }
  }, [state])

  function open(w: WorkflowId, href: string) {
    actions.setWorkflow(w)
    router.push(href)
  }

  const demActive = state.workflow === 'demulsifier'

  return (
    <>
      <PageHeader
        eyebrow="Workflows"
        title="Choose a Laboratory Workflow"
        description="Both workflows share historical experiment analysis, but they are judged on different criteria. Choosing one changes the fields, filters and analysis you see across the application."
      />

      <div className="flex flex-col gap-6">
        <section aria-labelledby="wf-dem" className={cn('panel overflow-hidden', demActive && 'ring-2 ring-primary/40')}>
          <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="teal">Workflow A</Pill>
                {demActive ? (
                  <Pill tone="green">
                    <CheckIcon className="size-3" aria-hidden /> Active
                  </Pill>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <h2 id="wf-dem" className="font-heading text-xl font-semibold text-ink">
                  Oilfield Chemical Formulation
                </h2>
                <p className="text-sm font-medium text-teal-ink">Demulsifier Bottle-Test Optimization</p>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Compare how demulsifier formulations separate water from crude under recorded dosage, temperature and settling time, and find the
                  conditions that have not been tested yet.
                </p>
              </div>
              <ParamList items={['Dosage (ppm)', 'Temperature (°C)', 'Settling time (min)', 'Water separation (%)', 'BS&W (%)']} />
              <dl className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                <Fact label="Experiments">
                  <span className="tnum">{dem.total}</span> <span className="text-xs text-muted-foreground">({dem.recent} since 1 Sep)</span>
                </Fact>
                <Fact label="Formulations">
                  <span className="tnum">{dem.fs.length}</span> available
                </Fact>
                <Fact label="Latest sample">
                  {dem.latest ? (
                    <>
                      <span className="tnum">{dem.latest.id}</span>
                      <span className="block text-xs text-muted-foreground">{fmtDate(dem.latest.testDate)}</span>
                    </>
                  ) : (
                    'None'
                  )}
                </Fact>
                <Fact label="Crude samples">
                  <span className="tnum">{state.crudes.length}</span> on record
                </Fact>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => open('demulsifier', '/analysis/demulsifier')}>
                  Open Bottle-Test Analysis
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
                <Button variant="outline" onClick={() => open('demulsifier', '/experiments')}>
                  View Experiments
                </Button>
              </div>
            </div>

            <div className="lab-grid flex flex-col justify-between gap-4 border-t bg-muted/50 p-6 lg:border-l lg:border-t-0">
              <div>
                <p className="eyebrow">Highest recorded separation</p>
                <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                  Best single result per formulation. Test conditions differ between bottles, so this is a snapshot, not a ranking.
                </p>
              </div>
              <div className="flex items-end justify-around gap-2">
                {dem.bottles.map((b) => (
                  <Bottle key={b.f.id} label={b.f.id} pct={b.best} color={b.f.color} />
                ))}
              </div>
              <p className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-amber-soft ring-1 ring-border" /> Oil phase
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-blue-soft ring-1 ring-border" /> Separated water
                </span>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="wf-gas" className={cn('panel p-6', !demActive && 'ring-2 ring-primary/40')}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="blue">Workflow B</Pill>
                {!demActive ? (
                  <Pill tone="green">
                    <CheckIcon className="size-3" aria-hidden /> Active
                  </Pill>
                ) : null}
                <Pill tone="amber">Validation required</Pill>
              </div>
              <div className="flex flex-col gap-2">
                <h2 id="wf-gas" className="font-heading text-lg font-semibold text-ink">
                  Gasoline Blending Optimization
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Review how blend composition and octane-booster dosage relate to research octane number (RON). The dataset is small and
                  screening-grade.
                </p>
              </div>
              <ParamList items={['Blend composition (%)', 'Additive dosage (ppm)', 'RON']} />
              <dl className="grid grid-cols-3 gap-4 border-t pt-4">
                <Fact label="Records">
                  <span className="tnum">{gas.total}</span>
                </Fact>
                <Fact label="With RON">
                  <span className="tnum">{gas.measured}</span> of <span className="tnum">{gas.total}</span>
                </Fact>
                <Fact label="RON range">
                  <span className="tnum">{gas.min !== null ? `${gas.min} to ${gas.max}` : 'Not measured'}</span>
                </Fact>
              </dl>
              <Notice tone="amber">
                Gasoline results are mock screening data. Treat any trend as a prompt for validation, not as a finding.
              </Notice>
              <div>
                <Button variant="outline" onClick={() => open('gasoline', '/analysis/gasoline')}>
                  Explore Gasoline Blending
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
              <p className="eyebrow">Blend composition ({plural(gas.blends.length, 'blend')})</p>
              <ul className="flex flex-col gap-3">
                {gas.blends.map((b) => (
                  <li key={b.id} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.id}</span>
                    </div>
                    <div role="img" aria-label={b.components.map((c) => `${c.name} ${c.pct} percent`).join(', ')} className="flex h-3 overflow-hidden rounded-full border bg-background">
                      {b.components.map((c, i) => (
                        <span key={c.name} className="h-full border-r border-background last:border-r-0" style={{ width: `${c.pct}%`, backgroundColor: b.color, opacity: 1 - i * 0.22 }} />
                      ))}
                    </div>
                    <p className="tnum text-xs text-muted-foreground">{b.components.map((c) => `${c.name} ${c.pct}%`).join(' · ')}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

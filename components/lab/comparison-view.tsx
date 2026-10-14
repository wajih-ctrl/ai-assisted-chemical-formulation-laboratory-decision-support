'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { FileTextIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { plural } from '@/lib/format'
import { buildDoseSeries, conditionDiffs, distinctValues, hasResult, mismatchReasons, type ReferenceConditions } from '@/lib/analysis'
import type { Experiment } from '@/lib/types'
import { EmptyNote, ExpLink, FormulationChip, GatedButton, Notice, PageHeader, Panel, Pill, Val } from './primitives'
import { AppSelect, MultiSelect, type Option } from './pickers'
import { DoseResponseChart } from './dose-chart'
import { ExperimentDrawer } from './experiment-drawer'

const DEFAULTS = { crudeId: 'CR-101', tempC: 60, settlingMin: 30, dose: 'all', matchedOnly: true }
const AXIS = { fontSize: 12, fill: '#526174' }

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function ComparisonView() {
  const { state, actions, role } = useApp()
  const router = useRouter()
  const params = useSearchParams()
  const [crudeId, setCrudeId] = useState(DEFAULTS.crudeId)
  const [tempC, setTempC] = useState(DEFAULTS.tempC)
  const [settlingMin, setSettlingMin] = useState(DEFAULTS.settlingMin)
  const [dose, setDose] = useState(DEFAULTS.dose)
  const [matchedOnly, setMatchedOnly] = useState(DEFAULTS.matchedOnly)
  const [openId, setOpenId] = useState<string | null>(null)

  const addParam = params.get('add')
  useEffect(() => {
    if (!addParam) return
    if (state.formulations.some((f) => f.id === addParam)) actions.addCompareFormulation(addParam)
    router.replace('/comparison')
  }, [addParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const ids = state.compare.formulationIds
  const demFormulations = useMemo(() => state.formulations.filter((f) => f.categoryId === 'cat-demul'), [state.formulations])
  const doses = useMemo(() => distinctValues(state.experiments, 'dosagePpm'), [state.experiments])
  const temps = useMemo(() => distinctValues(state.experiments, 'tempC'), [state.experiments])
  const settlings = useMemo(() => distinctValues(state.experiments, 'settlingMin'), [state.experiments])
  const refCond: ReferenceConditions = { crudeId, tempC, settlingMin }
  const colorOf = (id: string) => state.formulations.find((f) => f.id === id)?.color ?? '#5b6b82'

  const doseSeries = useMemo(
    () => buildDoseSeries(state.experiments, ids, refCond, matchedOnly),
    [state.experiments, ids, crudeId, tempC, settlingMin, matchedOnly], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const rows = useMemo(
    () =>
      state.experiments
        .filter((e) => ids.includes(e.formulationId) && hasResult(e))
        .filter((e) => dose === 'all' || e.dosagePpm === Number(dose))
        .filter((e) => !matchedOnly || mismatchReasons(e, refCond).length === 0)
        .sort((a, b) => a.formulationId.localeCompare(b.formulationId) || (a.dosagePpm ?? 0) - (b.dosagePpm ?? 0) || a.id.localeCompare(b.id)),
    [state.experiments, ids, dose, matchedOnly, crudeId, tempC, settlingMin], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const diffs = useMemo(() => conditionDiffs(rows), [rows])

  const summaries = ids.map((id) => {
    const list = rows.filter((e) => e.formulationId === id)
    const doseVals = list.map((e) => e.dosagePpm).filter((v): v is number => v !== null)
    const complete = list.filter((e) => e.residualWaterPct !== null && e.ragLayer !== null && e.clarity !== null).length
    return {
      id,
      list,
      min: doseVals.length ? Math.min(...doseVals) : null,
      max: doseVals.length ? Math.max(...doseVals) : null,
      crudes: Array.from(new Set(list.map((e) => e.crudeId))),
      complete,
      pct: list.length ? Math.round((complete / list.length) * 100) : 0,
    }
  })

  const residualData = useMemo(() => {
    const withResidual = rows.filter((e) => e.residualWaterPct !== null && e.dosagePpm !== null)
    const levels = Array.from(new Set(withResidual.map((e) => e.dosagePpm as number))).sort((a, b) => a - b)
    return levels.map((lvl) => {
      const entry: Record<string, number | string> = { dose: `${lvl} ppm` }
      ids.forEach((id) => {
        const vals = withResidual.filter((e) => e.dosagePpm === lvl && e.formulationId === id).map((e) => e.residualWaterPct as number)
        if (vals.length) entry[id] = Number(avg(vals).toFixed(2))
      })
      return entry
    })
  }, [rows, ids])
  const residualMissing = rows.filter((e) => e.residualWaterPct === null).length

  const summaryBars = summaries
    .filter((s) => s.list.length > 0)
    .map((s) => {
      const seps = s.list.map((e) => e.waterSepPct as number)
      return { id: s.id, mean: Number(avg(seps).toFixed(1)), min: Math.min(...seps), max: Math.max(...seps), n: seps.length }
    })

  const highest = useMemo<Experiment | null>(() => {
    if (!matchedOnly || diffs.length > 0 || rows.length === 0 || new Set(rows.map((e) => e.formulationId)).size < 2) return null
    return rows.reduce((best, e) => ((e.waterSepPct ?? -1) > (best.waterSepPct ?? -1) ? e : best), rows[0])
  }, [rows, matchedOnly, diffs.length])

  const formulationOptions: Option[] = demFormulations.map((f) => ({ value: f.id, label: f.id, hint: f.name }))
  const numOptions = (list: number[], unit: string): Option[] => list.map((n) => ({ value: String(n), label: `${n} ${unit}` }))
  const dirty =
    crudeId !== DEFAULTS.crudeId ||
    tempC !== DEFAULTS.tempC ||
    settlingMin !== DEFAULTS.settlingMin ||
    dose !== DEFAULTS.dose ||
    matchedOnly !== DEFAULTS.matchedOnly ||
    ids.join() !== 'DM-A101,DM-B205' ||
    state.compare.experimentIds.length > 0

  const reset = () => {
    actions.clearCompare()
    setCrudeId(DEFAULTS.crudeId)
    setTempC(DEFAULTS.tempC)
    setSettlingMin(DEFAULTS.settlingMin)
    setDose(DEFAULTS.dose)
    setMatchedOnly(DEFAULTS.matchedOnly)
    toast.success('Comparison reset to the default selection')
  }

  const addToReport = () => {
    actions.addReportItem({
      kind: 'comparison',
      title: `Formulation comparison: ${ids.join(', ')}`,
      detail: `${crudeId === 'all' ? 'All crudes' : crudeId} · ${tempC} °C · ${settlingMin} min · ${dose === 'all' ? 'all dosages' : `${dose} ppm`}. ${plural(rows.length, 'recorded result')}${
        diffs.length > 0 ? `; conditions differ (${diffs.map((d) => d.variable.toLowerCase()).join(', ')})` : ''
      }.`,
      refs: rows.map((e) => e.id),
    })
    toast.success('Comparison added to the report draft')
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Analysis"
        title="Compare Chemical Formulations"
        description="Place two to four formulations side by side. Recorded results are only directly comparable when crude sample, temperature, settling time and mixing match, so differing conditions are always flagged."
        actions={
          <>
            <Button variant="outline" onClick={reset} disabled={!dirty}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset comparison
            </Button>
            <GatedButton allowed={can(role, 'report:generate')} capability="report:generate" onClick={addToReport}>
              <FileTextIcon data-icon="inline-start" />
              Add comparison to report
            </GatedButton>
          </>
        }
      />

      <section aria-label="Comparison selection" className="panel mb-6 flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MultiSelect label="Formulations" options={formulationOptions} selected={ids} onChange={actions.setCompareFormulations} max={4} allLabel="None" />
          <AppSelect
            aria-label="Crude sample"
            value={crudeId}
            onChange={setCrudeId}
            options={[{ value: 'all', label: 'All crude samples' }, ...state.crudes.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }))]}
          />
          <AppSelect aria-label="Temperature" value={String(tempC)} onChange={(v) => setTempC(Number(v))} options={numOptions(temps, '°C')} />
          <AppSelect aria-label="Settling time" value={String(settlingMin)} onChange={(v) => setSettlingMin(Number(v))} options={numOptions(settlings, 'min')} />
          <AppSelect aria-label="Dosage comparison" value={dose} onChange={setDose} options={[{ value: 'all', label: 'All dosages' }, ...numOptions(doses, 'ppm')]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <Switch checked={matchedOnly} onCheckedChange={setMatchedOnly} aria-label="Comparable conditions only" />
            Comparable conditions only
          </label>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {plural(rows.length, 'recorded result')} across {plural(ids.length, 'formulation')}
          </p>
        </div>
      </section>

      {ids.length < 2 ? (
        <EmptyNote
          title={ids.length === 0 ? 'No formulations selected' : 'Select at least two formulations'}
          action={
            <Button variant="outline" onClick={reset}>
              <RotateCcwIcon data-icon="inline-start" />
              Restore default comparison
            </Button>
          }
        >
          Choose two to four formulations in the selection bar to compare their recorded bottle-test results.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-6">
          {diffs.length > 0 ? (
            <Notice tone="amber" title="Test conditions differ. Results are not directly equivalent.">
              <p>Exploration is allowed, but no formulation is presented as superior. The compared experiments differ in:</p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {diffs.map((d) => (
                  <li key={d.variable}>
                    <span className="font-medium">{d.variable}:</span> {d.values.join(' · ')}
                  </li>
                ))}
              </ul>
              {matchedOnly ? null : <p className="mt-1.5">Turn on comparable conditions only to restrict the view to one set of conditions.</p>}
            </Notice>
          ) : highest ? (
            <Notice tone="teal" title="Matched conditions">
              Within this matched set, the highest observed water separation was {highest.waterSepPct} % for {highest.formulationId} at {highest.dosagePpm} ppm (
              <ExpLink id={highest.id} />
              ). This describes the recorded results only and does not establish a superior formulation.
            </Notice>
          ) : null}

          <section aria-label="Formulation summaries" className={cn('grid gap-4 sm:grid-cols-2', ids.length === 3 && 'xl:grid-cols-3', ids.length >= 4 && 'xl:grid-cols-4')}>
            {summaries.map((s) => {
              const f = state.formulations.find((x) => x.id === s.id)
              return (
                <div key={s.id} className="panel flex flex-col gap-3 p-4" style={{ borderTopColor: colorOf(s.id), borderTopWidth: 3 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <FormulationChip id={s.id} color={colorOf(s.id)} />
                      <span className="truncate text-xs text-muted-foreground">{f?.name}</span>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => actions.removeCompareFormulation(s.id)} aria-label={`Remove ${s.id} from comparison`}>
                      <XIcon />
                    </Button>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <dt className="eyebrow">Matching experiments</dt>
                      <dd className="tnum text-ink">{s.list.length}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="eyebrow">Tested dosage</dt>
                      <dd className="tnum text-ink">{s.min === null ? <span className="text-xs italic text-subtle">None recorded</span> : s.min === s.max ? `${s.min} ppm` : `${s.min}–${s.max} ppm`}</dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <dt className="eyebrow">Observed water separation</dt>
                      <dd className="tnum text-ink">{s.list.length ? s.list.map((e) => `${e.waterSepPct}`).join(', ') + ' %' : <span className="text-xs italic text-subtle">No recorded results</span>}</dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <dt className="eyebrow">Crude samples covered</dt>
                      <dd className="text-ink">{s.crudes.length ? s.crudes.join(', ') : '—'}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="eyebrow">Data completeness</span>
                      <span className="tnum text-muted-foreground">
                        {s.complete} of {s.list.length} fully recorded
                      </span>
                    </div>
                    <Progress value={s.pct} aria-label={`${s.id} data completeness`} />
                  </div>
                </div>
              )
            })}
          </section>

          <Panel
            title="Water separation vs chemical dosage"
            description={`${crudeId === 'all' ? 'All crude samples' : crudeId} at ${tempC} °C and ${settlingMin} min. Select a point to open its experiment; hollow markers differ from these conditions.`}
          >
            {doseSeries.some((s) => s.points.length > 0) ? (
              <DoseResponseChart series={doseSeries} formulations={state.formulations} height={320} onSelect={setOpenId} selectedId={openId} />
            ) : (
              <EmptyNote title="No recorded results">No completed experiments for the selected formulations match these conditions.</EmptyNote>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Recorded residual water" description={residualMissing > 0 ? `Mean per dosage. ${plural(residualMissing, 'result')} without a residual-water measurement are excluded, not shown as zero.` : 'Mean per dosage level in the comparison set.'}>
              {residualData.length > 0 ? (
                <div role="img" aria-label="Grouped bar chart of mean recorded residual water per dosage and formulation" className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={residualData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dose" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} width={56} unit=" %" />
                      <Tooltip formatter={(v) => [`${v} %`, 'Residual water']} cursor={{ fill: '#eef2f6' }} isAnimationActive={false} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      {ids.map((id) => (
                        <Bar key={id} dataKey={id} name={id} fill={colorOf(id)} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyNote title="Residual water not measured">None of the compared experiments recorded residual water.</EmptyNote>
              )}
            </Panel>

            <Panel title="Comparable experiment summary" description="Mean recorded water separation per formulation in the current set, with the number of results behind it.">
              {summaryBars.length > 0 ? (
                <div role="img" aria-label="Bar chart of mean recorded water separation per formulation" className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryBars} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="id" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} />
                      <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} width={56} unit=" %" />
                      <Tooltip
                        cursor={{ fill: '#eef2f6' }}
                        isAnimationActive={false}
                        content={({ active, payload }) => {
                          const d = payload?.[0]?.payload as (typeof summaryBars)[number] | undefined
                          if (!active || !d) return null
                          return (
                            <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                              <p className="font-semibold text-ink">{d.id}</p>
                              <p className="tnum text-ink">Mean {d.mean} % water separation</p>
                              <p className="tnum text-muted-foreground">
                                Range {d.min}–{d.max} % · n = {d.n}
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="mean" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {summaryBars.map((b) => (
                          <Cell key={b.id} fill={colorOf(b.id)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyNote title="No results to summarise">Adjust the conditions to include recorded results.</EmptyNote>
              )}
              {diffs.length > 0 && summaryBars.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Means combine experiments run under differing conditions and are shown for exploration only.</p>
              ) : null}
            </Panel>
          </div>

          <Panel title="Detailed comparison matrix" description="Every recorded result behind the charts. Select an experiment ID to view its full record." bodyClassName="p-0">
            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formulation</TableHead>
                      <TableHead>Experiment</TableHead>
                      <TableHead>Crude sample</TableHead>
                      <TableHead className="text-right">Dosage (ppm)</TableHead>
                      <TableHead className="text-right">Temp (°C)</TableHead>
                      <TableHead className="text-right">Settling (min)</TableHead>
                      <TableHead className="text-right">Water sep. (%)</TableHead>
                      <TableHead className="text-right">Residual water (%)</TableHead>
                      <TableHead>Rag-layer observation</TableHead>
                      <TableHead className="min-w-64">Performance notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((e) => (
                      <TableRow key={e.id} data-state={state.compare.experimentIds.includes(e.id) ? 'selected' : undefined}>
                        <TableCell>
                          <FormulationChip id={e.formulationId} color={colorOf(e.formulationId)} />
                        </TableCell>
                        <TableCell>
                          <button type="button" onClick={() => setOpenId(e.id)} className="tnum font-medium text-teal-ink underline-offset-2 hover:underline">
                            {e.id}
                          </button>
                          {state.compare.experimentIds.includes(e.id) ? (
                            <Pill tone="teal" className="ml-1.5">
                              Selected
                            </Pill>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{e.crudeId}</TableCell>
                        <TableCell className="text-right">
                          <Val v={e.dosagePpm} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Val v={e.tempC} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Val v={e.settlingMin} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <Val v={e.waterSepPct} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Val v={e.residualWaterPct} digits={1} />
                        </TableCell>
                        <TableCell className="text-sm">{e.ragLayer ?? <span className="text-xs italic text-subtle">Not measured</span>}</TableCell>
                        <TableCell className="whitespace-normal text-sm text-muted-foreground">{e.observations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyNote title="No rows to show">No completed experiments match the selected formulations and conditions.</EmptyNote>
              </div>
            )}
          </Panel>
        </div>
      )}

      <ExperimentDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

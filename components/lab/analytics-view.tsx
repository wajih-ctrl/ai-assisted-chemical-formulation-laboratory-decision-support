'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileTextIcon, RotateCcwIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/lib/store'
import { can } from '@/lib/roles'
import { TODAY_ISO } from '@/lib/seed'
import { fmtDate, fmtDateShort, mean, plural } from '@/lib/format'
import { buildDoseSeries, crudeLabel, distinctValues, hasResult, repeatGroups, type DosePoint, type DoseSeries } from '@/lib/analysis'
import type { Experiment } from '@/lib/types'
import { EmptyNote, ExpLink, FormulationChip, GatedButton, KeyValue, Notice, PageHeader, Panel, Pill } from './primitives'
import { AppSelect, MultiSelect, type Option } from './pickers'
import { DoseResponseChart } from './dose-chart'
import { ExperimentDrawer } from './experiment-drawer'

const AXIS = { fontSize: 12, fill: '#526174' }
const GRID = '#e2e8ef'
const REF = { dose: 100, temp: 60, settling: 30 }
const DAY = 864e5

const RANGE_OPTIONS: Option[] = [
  { value: 'all', label: 'All recorded dates' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
]

function inRange(date: string, range: string): boolean {
  if (range === 'all') return true
  if (range.includes('-')) return date.startsWith(range)
  const cutoff = new Date(`${TODAY_ISO}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - Number(range))
  return date >= cutoff.toISOString().slice(0, 10) && date <= TODAY_ISO
}

function weekStart(iso: string): string {
  const base = new Date('2026-09-01T00:00:00Z').getTime()
  const k = Math.floor((new Date(`${iso}T00:00:00Z`).getTime() - base) / (7 * DAY))
  return new Date(base + k * 7 * DAY).toISOString().slice(0, 10)
}

/** Scatter series against one varied condition; the other conditions are flagged when they differ from the reference. */
function buildScatter(exps: Experiment[], ids: string[], xKey: 'settlingMin' | 'tempC'): DoseSeries[] {
  return ids.map((fid) => {
    const points = exps
      .filter((e) => e.formulationId === fid && hasResult(e) && e[xKey] !== null)
      .map<DosePoint>((e) => {
        const mismatch: string[] = []
        if (e.dosagePpm !== REF.dose) mismatch.push(`${e.dosagePpm ?? 'n/a'} ppm vs ${REF.dose} ppm`)
        if (xKey !== 'tempC' && e.tempC !== REF.temp) mismatch.push(`${e.tempC ?? 'n/a'} °C vs ${REF.temp} °C`)
        if (xKey !== 'settlingMin' && e.settlingMin !== REF.settling) mismatch.push(`${e.settlingMin ?? 'n/a'} min vs ${REF.settling} min`)
        return { x: e[xKey] as number, y: e.waterSepPct as number, id: e.id, formulationId: fid, exp: e, mismatch }
      })
    const byX = new Map<number, number[]>()
    points.filter((p) => p.mismatch.length === 0).forEach((p) => byX.set(p.x, [...(byX.get(p.x) ?? []), p.y]))
    const means = Array.from(byX.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, ys]) => ({ x, y: mean(ys) as number, n: ys.length }))
    return { formulationId: fid, points, means }
  })
}

function binLabel(b: number): string {
  return b >= 100 ? '100' : `${b}–${b + 9}`
}

export function AnalyticsView() {
  const { state, actions, role } = useApp()
  const [datasetId, setDatasetId] = useState('all')
  const [crudeId, setCrudeId] = useState('all')
  const [fids, setFids] = useState<string[]>([])
  const [range, setRange] = useState('all')
  const [perfDose, setPerfDose] = useState(String(REF.dose))
  const [perfTemp, setPerfTemp] = useState(String(REF.temp))
  const [perfSettling, setPerfSettling] = useState(String(REF.settling))
  const [showSingles, setShowSingles] = useState(false)
  const [bin, setBin] = useState<number | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const demFormulations = useMemo(() => state.formulations.filter((f) => f.categoryId === 'cat-demul'), [state.formulations])
  const demDatasets = useMemo(() => state.datasets.filter((d) => d.workflow === 'demulsifier'), [state.datasets])
  const colorOf = (id: string) => state.formulations.find((f) => f.id === id)?.color ?? '#5b6b82'

  const scope = useMemo(() => {
    const allowed = fids.length ? fids : demFormulations.map((f) => f.id)
    return state.experiments.filter(
      (e) =>
        e.workflow === 'demulsifier' &&
        allowed.includes(e.formulationId) &&
        (datasetId === 'all' || e.datasetId === datasetId) &&
        (crudeId === 'all' || e.crudeId === crudeId) &&
        inRange(e.testDate, range),
    )
  }, [state.experiments, demFormulations, fids, datasetId, crudeId, range])

  const results = useMemo(() => scope.filter(hasResult), [scope])
  const seriesIds = useMemo(
    () => demFormulations.map((f) => f.id).filter((id) => results.some((e) => e.formulationId === id)),
    [demFormulations, results],
  )

  const doseSeries = useMemo(
    () => buildDoseSeries(results, seriesIds, { crudeId, tempC: REF.temp, settlingMin: REF.settling }, false),
    [results, seriesIds, crudeId],
  )
  const settlingSeries = useMemo(() => buildScatter(results, seriesIds, 'settlingMin'), [results, seriesIds])
  const tempSeries = useMemo(() => buildScatter(results, seriesIds, 'tempC'), [results, seriesIds])

  const perfCrude = crudeId === 'all' ? 'CR-101' : crudeId
  const perf = useMemo(() => {
    const matched = results.filter(
      (e) =>
        e.crudeId === perfCrude &&
        e.dosagePpm === Number(perfDose) &&
        e.tempC === Number(perfTemp) &&
        e.settlingMin === Number(perfSettling),
    )
    const bars = seriesIds
      .map((id) => {
        const vals = matched.filter((e) => e.formulationId === id).map((e) => e.waterSepPct as number)
        return vals.length ? { id, mean: Number((mean(vals) as number).toFixed(1)), min: Math.min(...vals), max: Math.max(...vals), n: vals.length } : null
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
    const untested = seriesIds.filter((id) => !bars.some((b) => b.id === id))
    return { bars, untested }
  }, [results, seriesIds, perfCrude, perfDose, perfTemp, perfSettling])

  const histogram = useMemo(() => {
    if (!results.length) return { rows: [] as Record<string, number | string>[], lo: 0 }
    const vals = results.map((e) => e.waterSepPct as number)
    const lo = Math.floor(Math.min(...vals) / 10) * 10
    const hi = Math.floor(Math.max(...vals) / 10) * 10
    const rows: Record<string, number | string>[] = []
    for (let b = lo; b <= hi; b += 10) {
      const inBin = results.filter((e) => Math.floor((e.waterSepPct as number) / 10) * 10 === b)
      const row: Record<string, number | string> = { bin: binLabel(b), start: b, count: inBin.length }
      seriesIds.forEach((id) => (row[id] = inBin.filter((e) => e.formulationId === id).length))
      rows.push(row)
    }
    return { rows, lo }
  }, [results, seriesIds])

  const binExperiments = useMemo(
    () =>
      bin === null
        ? []
        : results
            .filter((e) => Math.floor((e.waterSepPct as number) / 10) * 10 === bin)
            .sort((a, b) => (b.waterSepPct as number) - (a.waterSepPct as number) || a.id.localeCompare(b.id)),
    [results, bin],
  )

  const trend = useMemo(() => {
    const logged = scope.filter((e) => e.testDate <= TODAY_ISO && !['Draft', 'Planned', 'Cancelled'].includes(e.status))
    if (!logged.length) return []
    const starts = logged.map((e) => weekStart(e.testDate)).sort()
    const first = new Date(`${starts[0]}T00:00:00Z`).getTime()
    const last = new Date(`${starts[starts.length - 1]}T00:00:00Z`).getTime()
    const rows: { week: string; label: string; tests: number; sep: number | null; n: number }[] = []
    for (let t = first; t <= last; t += 7 * DAY) {
      const wk = new Date(t).toISOString().slice(0, 10)
      const inWeek = logged.filter((e) => weekStart(e.testDate) === wk)
      const withRes = inWeek.filter(hasResult)
      const m = mean(withRes.map((e) => e.waterSepPct as number))
      rows.push({ week: wk, label: fmtDateShort(wk), tests: inWeek.length, sep: m === null ? null : Number(m.toFixed(1)), n: withRes.length })
    }
    return rows
  }, [scope])

  const repeats = useMemo(() => repeatGroups(results).filter((g) => showSingles || g.experiments.length > 1), [results, showSingles])

  const doseOptions: Option[] = distinctValues(state.experiments, 'dosagePpm').map((n) => ({ value: String(n), label: `${n} ppm` }))
  const tempOptions: Option[] = distinctValues(state.experiments, 'tempC').map((n) => ({ value: String(n), label: `${n} °C` }))
  const settleOptions: Option[] = distinctValues(state.experiments, 'settlingMin').map((n) => ({ value: String(n), label: `${n} min` }))

  const dates = scope.map((e) => e.testDate).sort()
  const crudesCovered = Array.from(new Set(scope.map((e) => e.crudeId)))
  const formulationsCovered = Array.from(new Set(scope.map((e) => e.formulationId)))
  const datasetName = datasetId === 'all' ? 'All demulsifier datasets' : (demDatasets.find((d) => d.id === datasetId)?.name ?? datasetId)
  const dirty = datasetId !== 'all' || crudeId !== 'all' || fids.length > 0 || range !== 'all'

  const reset = () => {
    setDatasetId('all')
    setCrudeId('all')
    setFids([])
    setRange('all')
    setBin(null)
    toast.success('Analytics filters reset')
  }

  const addToReport = () => {
    actions.addReportItem({
      kind: 'analysis-view',
      title: 'Performance analytics view',
      detail: `${datasetName} · ${crudeId === 'all' ? 'all crude samples' : crudeId} · ${RANGE_OPTIONS.find((r) => r.value === range)?.label}. ${plural(results.length, 'recorded result')} across ${plural(seriesIds.length, 'formulation')}.`,
      refs: results.slice(0, 12).map((e) => e.id),
    })
    toast.success('Analytics view added to the report builder')
  }

  const open = (id: string) => setOpenId(id)

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Analysis"
        title="Performance Analytics"
        description="Explore recorded bottle-test results across datasets, crude samples and time. Missing measurements are excluded from charts, never treated as zero."
        actions={
          <>
            <Button variant="outline" onClick={reset} disabled={!dirty}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset filters
            </Button>
            <GatedButton allowed={can(role, 'report:generate')} capability="report:generate" onClick={addToReport}>
              <FileTextIcon data-icon="inline-start" />
              Add to report
            </GatedButton>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <Panel title="Scope and filters" description="Filters apply to every module on this page.">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="eyebrow">Dataset</p>
                <AppSelect
                  aria-label="Dataset"
                  value={datasetId}
                  onChange={setDatasetId}
                  options={[{ value: 'all', label: 'All datasets' }, ...demDatasets.map((d) => ({ value: d.id, label: `${d.id} · ${d.name}` }))]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="eyebrow">Crude sample</p>
                <AppSelect
                  aria-label="Crude sample"
                  value={crudeId}
                  onChange={setCrudeId}
                  options={[{ value: 'all', label: 'All crude samples' }, ...state.crudes.map((c) => ({ value: c.id, label: crudeLabel(state.crudes, c.id) }))]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="eyebrow">Formulations</p>
                <MultiSelect
                  label="Formulations"
                  allLabel="All"
                  selected={fids}
                  onChange={setFids}
                  options={demFormulations.map((f) => ({ value: f.id, label: f.id, hint: f.name }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="eyebrow">Time range</p>
                <AppSelect aria-label="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
              </div>
            </div>
          </Panel>
          <Notice tone="blue" title="Reading the charts">
            Filled markers match the reference conditions of each chart. Hollow dashed markers differ in another condition. Select any marker to open its experiment.
          </Notice>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
              <KeyValue label="Dataset scope">
                <span className="line-clamp-2">{datasetName}</span>
              </KeyValue>
              <KeyValue label="Experiments">
                <span className="tnum text-lg font-semibold">{scope.length}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{results.length} with results</span>
              </KeyValue>
              <KeyValue label="Formulations">
                <span className="tnum text-lg font-semibold">{formulationsCovered.length}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">covered</span>
              </KeyValue>
              <KeyValue label="Crude samples">
                <span className="tnum text-lg font-semibold">{crudesCovered.length}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{crudesCovered.join(', ') || 'None'}</span>
              </KeyValue>
              <KeyValue label="Date range">
                {dates.length ? `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : 'No experiments'}
              </KeyValue>
            </dl>
          </Panel>

          {results.length === 0 ? (
            <EmptyNote
              title="No recorded results match these filters"
              action={
                <Button variant="outline" onClick={reset}>
                  Reset filters
                </Button>
              }
            >
              Widen the dataset, crude sample, formulation or time range to see charts. Experiments without a measured water separation are never plotted.
            </EmptyNote>
          ) : (
            <>
              <Panel
                title="Dosage vs separation"
                description={`Recorded water separation by chemical dosage. Reference: ${crudeId === 'all' ? 'any crude' : crudeId}, ${REF.temp} °C, ${REF.settling} min.`}
                action={<SeriesKey ids={seriesIds} colorOf={colorOf} />}
              >
                <DoseResponseChart series={doseSeries} formulations={state.formulations} height={300} onSelect={open} selectedId={openId} hideLegend />
              </Panel>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel title="Separation vs settling time" description={`Reference: ${REF.dose} ppm, ${REF.temp} °C.`}>
                  <DoseResponseChart
                    series={settlingSeries}
                    formulations={state.formulations}
                    height={270}
                    xLabel="Settling time (min)"
                    xName="Settling time"
                    xUnit="min"
                    onSelect={open}
                    selectedId={openId}
                    hideLegend
                  />
                </Panel>
                <Panel title="Temperature vs separation" description={`Reference: ${REF.dose} ppm, ${REF.settling} min. Observational only.`}>
                  <DoseResponseChart
                    series={tempSeries}
                    formulations={state.formulations}
                    height={270}
                    xLabel="Bath temperature (°C)"
                    xName="Temperature"
                    xUnit="°C"
                    onSelect={open}
                    selectedId={openId}
                    hideLegend
                  />
                </Panel>
              </div>

              <Panel
                title="Formulation performance"
                description={`Mean recorded water separation per formulation on ${perfCrude} at matched conditions.`}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <AppSelect aria-label="Dosage" value={perfDose} onChange={setPerfDose} options={doseOptions} className="w-28" />
                    <AppSelect aria-label="Temperature" value={perfTemp} onChange={setPerfTemp} options={tempOptions} className="w-24" />
                    <AppSelect aria-label="Settling time" value={perfSettling} onChange={setPerfSettling} options={settleOptions} className="w-24" />
                  </div>
                }
              >
                {perf.bars.length === 0 ? (
                  <EmptyNote title="No formulation has results at these conditions">Try a different dosage, temperature or settling time.</EmptyNote>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div
                      role="img"
                      aria-label={`Bar chart of mean water separation for ${perf.bars.map((b) => `${b.id} ${b.mean} %`).join(', ')}`}
                      className="h-64 w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perf.bars} margin={{ top: 12, right: 18, bottom: 8, left: 6 }}>
                          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="id" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} />
                          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} width={52} tickFormatter={(v: number) => `${v} %`} />
                          <Tooltip
                            cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                            isAnimationActive={false}
                            content={({ active, payload }) => {
                              const d = active ? (payload?.[0]?.payload as (typeof perf.bars)[number] | undefined) : undefined
                              if (!d) return null
                              return (
                                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                  <p className="font-semibold text-ink">{d.id}</p>
                                  <p className="tnum mt-1 text-ink">Mean {d.mean} % water separation</p>
                                  <p className="tnum text-muted-foreground">
                                    Range {d.min}–{d.max} % · {plural(d.n, 'test')}
                                  </p>
                                </div>
                              )
                            }}
                          />
                          <Bar dataKey="mean" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={72}>
                            {perf.bars.map((b) => (
                              <Cell key={b.id} fill={colorOf(b.id)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {perf.bars.map((b) => `${b.id}: ${plural(b.n, 'test')}`).join(' · ')}.
                      {perf.untested.length ? ` Untested at these conditions: ${perf.untested.join(', ')}.` : ''} Bars describe the recorded tests only and do not rank formulations.
                    </p>
                  </div>
                )}
              </Panel>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Experiment performance distribution"
                  description="Count of recorded experiments by water-separation band. Select a bar to list its experiments."
                  action={<SeriesKey ids={seriesIds} colorOf={colorOf} />}
                >
                  <div
                    role="img"
                    aria-label={`Histogram of recorded water separation across ${results.length} experiments`}
                    className="h-64 w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogram.rows} margin={{ top: 12, right: 18, bottom: 24, left: 0 }}>
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="bin"
                          tick={AXIS}
                          tickLine={false}
                          axisLine={{ stroke: '#cfd8e3' }}
                          label={{ value: 'Water separation (%)', position: 'insideBottom', offset: -14, fontSize: 12, fill: '#526174' }}
                        />
                        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} width={40} />
                        <Tooltip
                          cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                          isAnimationActive={false}
                          labelFormatter={(l) => `${l} % water separation`}
                          formatter={(v, n) => [`${v} ${Number(v) === 1 ? 'experiment' : 'experiments'}`, String(n)]}
                        />
                        {seriesIds.map((id) => (
                          <Bar
                            key={id}
                            dataKey={id}
                            stackId="dist"
                            fill={colorOf(id)}
                            isAnimationActive={false}
                            cursor="pointer"
                            onClick={(d: unknown) => {
                              const start = (d as { payload?: { start?: number } })?.payload?.start
                              if (typeof start === 'number') setBin((cur) => (cur === start ? null : start))
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {bin !== null ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">
                          {plural(binExperiments.length, 'experiment')} between {binLabel(bin)} %
                        </p>
                        <Button variant="ghost" size="xs" onClick={() => setBin(null)}>
                          Clear
                        </Button>
                      </div>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {binExperiments.map((e) => (
                          <li key={e.id} className="flex items-center gap-1.5 text-xs">
                            <button type="button" onClick={() => open(e.id)} className="tnum font-medium text-teal-ink underline-offset-2 hover:underline">
                              {e.id}
                            </button>
                            <span className="text-muted-foreground">
                              {e.formulationId} · {e.waterSepPct} %
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Panel>

                <Panel
                  title="Historical trends"
                  description="Weekly test activity and measured results are shown separately. Weeks without results have no point."
                >
                  {trend.length === 0 ? (
                    <EmptyNote title="No logged tests in this range" />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="eyebrow">Experiments logged per week</p>
                      <div role="img" aria-label="Bar chart of experiments logged per week" className="h-28 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trend} margin={{ top: 6, right: 18, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" hide />
                            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                            <Tooltip
                              cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                              isAnimationActive={false}
                              labelFormatter={(l) => `Week of ${l}`}
                              formatter={(v) => [`${v} ${Number(v) === 1 ? 'experiment' : 'experiments'}`, 'Logged']}
                            />
                            <Bar dataKey="tests" fill="#9fb3c8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="eyebrow pt-2">Mean recorded water separation per week</p>
                      <div role="img" aria-label="Line chart of mean recorded water separation per week" className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend} margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
                            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cfd8e3' }} />
                            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v} %`} />
                            <Tooltip
                              isAnimationActive={false}
                              labelFormatter={(l) => `Week of ${l}`}
                              formatter={(v) => [`${v} %`, 'Mean water separation']}
                            />
                            <Line type="monotone" dataKey="sep" stroke="#0f766e" strokeWidth={2} dot={{ r: 4, fill: '#0f766e' }} connectNulls={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </Panel>
              </div>

              <Panel
                title="Repeated experiment conditions"
                description="Experiments sharing formulation, crude sample, dosage, temperature and settling time, with the observed range of results."
                action={
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={showSingles} onCheckedChange={setShowSingles} aria-label="Include single-test conditions" />
                    Include single tests
                  </label>
                }
                bodyClassName="p-0"
              >
                {repeats.length === 0 ? (
                  <div className="p-4">
                    <EmptyNote title="No repeated conditions in this scope">Turn on single tests to list every recorded condition set.</EmptyNote>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Formulation</TableHead>
                        <TableHead>Crude</TableHead>
                        <TableHead className="text-right">Dosage (ppm)</TableHead>
                        <TableHead className="text-right">Temp (°C)</TableHead>
                        <TableHead className="text-right">Settling (min)</TableHead>
                        <TableHead className="text-right">Tests</TableHead>
                        <TableHead className="text-right">Observed range (%)</TableHead>
                        <TableHead>Experiments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repeats.map((g) => (
                        <TableRow key={g.key}>
                          <TableCell>
                            <FormulationChip id={g.formulationId} color={colorOf(g.formulationId)} />
                          </TableCell>
                          <TableCell className="tnum">{g.crudeId}</TableCell>
                          <TableCell className="tnum text-right">{g.dosagePpm}</TableCell>
                          <TableCell className="tnum text-right">{g.tempC}</TableCell>
                          <TableCell className="tnum text-right">{g.settlingMin}</TableCell>
                          <TableCell className="tnum text-right">{g.experiments.length}</TableCell>
                          <TableCell className="tnum text-right">
                            {g.min === g.max ? g.min : `${g.min}–${g.max}`}
                            {g.experiments.length > 1 ? <Pill className="ml-2">spread {g.max - g.min} pts</Pill> : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {g.experiments.map((e) => (
                                <ExpLink key={e.id} id={e.id} className="text-xs" />
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
      <ExperimentDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function SeriesKey({ ids, colorOf }: { ids: string[]; colorOf: (id: string) => string }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Formulation key">
      {ids.map((id) => (
        <li key={id} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs text-ink">
          <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: colorOf(id) }} />
          {id}
        </li>
      ))}
    </ul>
  )
}

'use client'

import type { ReactNode } from 'react'
import { CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Scatter, XAxis, YAxis } from 'recharts'
import { DoseResponseChart } from '@/components/lab/dose-chart'
import { fmtDate } from '@/lib/format'
import { REPORT_DISCLAIMER, REPORT_LABEL, REPORT_NOTICE, type ReportData, type TableData } from '@/lib/report'
import type { Formulation } from '@/lib/types'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="report-section flex flex-col gap-3 border-t pt-5">
      <h3 className="font-heading text-base font-semibold text-ink">
        <span className="tnum mr-2 text-teal-ink">{n}.</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
}

function DocTable({ data, caption }: { data: TableData; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-muted">
            {data.head.map((h) => (
              <th key={h} scope="col" className="px-2.5 py-2 font-semibold text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-2.5 py-1.5 ${j === 0 ? 'font-medium text-ink' : 'text-foreground'} ${c === 'Not measured' ? 'italic text-subtle' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GasChart({ data }: { data: ReportData }) {
  const total = data.gasSeries.reduce((n, s) => n + s.points.length, 0)
  return (
    <div role="img" aria-label={`Chart of measured RON against booster dosage with ${total} recorded experiments`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 12, right: 18, bottom: 28, left: 6 }}>
          <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            allowDecimals={false}
            label={{ value: 'Booster dosage (ppm)', position: 'insideBottom', offset: -16, fontSize: 12, fill: '#526174' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            width={44}
            label={{ value: 'Measured RON', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12, fill: '#526174', style: { textAnchor: 'middle' } }}
          />
          <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {data.gasSeries.map((s) => (
            <Line key={`l-${s.key}`} data={s.points} dataKey="y" stroke={s.color} strokeOpacity={0.6} strokeWidth={1.5} dot={false} legendType="none" isAnimationActive={false} />
          ))}
          {data.gasSeries.map((s) => (
            <Scatter key={`s-${s.key}`} data={s.points} name={s.label} fill={s.color} isAnimationActive={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReportDocument({ data, formulations }: { data: ReportData; formulations: Formulation[] }) {
  const hasChartData = data.workflow === 'demulsifier' ? data.demSeries.some((s) => s.points.length > 0) : data.gasSeries.some((s) => s.points.length > 0)
  return (
    <article
      id="report-document"
      aria-label={`Report preview: ${data.title}`}
      className="mx-auto flex w-full max-w-[860px] flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm md:p-10"
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-md bg-ink px-4 py-3 text-white">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-base font-semibold tracking-[0.18em]">STRATA LAB</span>
            <span className="hidden text-xs text-white/70 sm:inline">Laboratory Intelligence Report</span>
          </div>
          <span className="tnum text-xs text-white/70">{data.reportId}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-2xl font-semibold leading-tight text-ink text-balance md:text-[1.9rem]">{data.title}</h2>
          <p className="text-sm text-muted-foreground">
            Prepared by {data.authorName} · {fmtDate(data.generatedOn)} ·{' '}
            {data.workflow === 'demulsifier' ? 'Oilfield Demulsifier Workflow' : 'Gasoline Blending Workflow'}
          </p>
        </div>
        <div role="note" className="rounded-md bg-amber-soft px-3.5 py-3 text-sm leading-relaxed text-amber-ink">
          <p className="font-semibold">{REPORT_LABEL}</p>
          <p className="mt-0.5">{REPORT_NOTICE}</p>
        </div>
      </header>

      <Section n={1} title="Dataset Overview">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {data.overview.map((o) => (
            <div key={o.label} className="flex flex-col gap-0.5">
              <dt className="eyebrow">{o.label}</dt>
              <dd className="text-sm text-ink">{o.value}</dd>
            </div>
          ))}
        </dl>
        {data.datasetTable.rows.length ? <DocTable data={data.datasetTable} caption="Datasets included in this report" /> : <Muted>No datasets are in scope for the selected filters.</Muted>}
      </Section>

      <Section n={2} title="Experiment Summary">
        {data.empty ? (
          <Muted>No experiments match the selected filters. Widen the date range or select more formulations to populate this report.</Muted>
        ) : (
          <DocTable data={data.experimentTable} caption="Experiments included in this report" />
        )}
      </Section>

      <Section n={3} title={data.groupTitle}>
        {data.groups.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.groups.map((g) => (
              <li key={g.key} className="flex flex-col gap-1.5 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm font-semibold text-ink">{g.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{g.sub}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{g.description}</p>
                <p className="tnum text-xs text-ink">
                  {g.tests} tests, {g.withResults} with results ·{' '}
                  {g.meanValue === null ? (
                    <span className="italic text-subtle">Not measured</span>
                  ) : (
                    <>
                      mean {g.meanValue.toFixed(1)} ({g.min?.toFixed(1)} to {g.max?.toFixed(1)}) {data.groupUnit}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Muted>No formulations are in scope.</Muted>
        )}
      </Section>

      <Section n={4} title="Test Conditions">
        <DocTable data={data.conditionTable} caption="Test conditions represented in this report" />
        {data.conditionWarnings.map((w) => (
          <div key={w} role="note" className="rounded-md bg-amber-soft px-3 py-2 text-xs leading-relaxed text-amber-ink">
            <span className="font-semibold">Comparability note. </span>
            {w}
          </div>
        ))}
      </Section>

      <Section n={5} title="Performance Charts">
        {!data.config.includeCharts ? (
          <Muted>Charts were excluded from this report configuration.</Muted>
        ) : !hasChartData ? (
          <Muted>No recorded results are available to chart for the selected filters.</Muted>
        ) : (
          <>
            {data.workflow === 'demulsifier' ? <DoseResponseChart series={data.demSeries} formulations={formulations} height={300} /> : <GasChart data={data} />}
            <p className="text-xs leading-relaxed text-muted-foreground">{data.chartCaption}</p>
          </>
        )}
      </Section>

      <Section n={6} title="Important Laboratory Observations">
        {data.config.includeInsights ? (
          data.insights.length ? (
            <ul className="flex flex-col gap-3">
              {data.insights.map((i) => (
                <li key={i.id} className="flex flex-col gap-1 rounded-md border p-3">
                  <p className="text-sm font-semibold text-ink">{i.title}</p>
                  <p className="text-sm leading-relaxed text-foreground">{i.observation}</p>
                  <p className="text-xs text-muted-foreground">Conditions: {i.conditions}</p>
                  <p className="text-xs text-muted-foreground">
                    Evidence: {i.experimentIds.join(', ') || 'None cited'} · Limitations: {i.limitations}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Muted>No analytical insights apply to the selected formulations.</Muted>
          )
        ) : (
          <Muted>AI-assisted insights were excluded from this report configuration.</Muted>
        )}
        {data.observations.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="eyebrow">Recorded laboratory notes</p>
            <ul className="flex flex-col gap-1.5">
              {data.observations.map((o) => (
                <li key={o.id} className="text-sm leading-relaxed text-foreground">
                  <span className="font-medium text-ink">{o.title}.</span> {o.body}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section n={7} title="Supporting Experimental References">
        {data.references.length ? (
          <DocTable
            caption="Experiments cited by this report"
            data={{
              head: ['Experiment', 'Conditions', 'Recorded result', 'Cited by'],
              rows: data.references.map((r) => [r.id + (r.inScope ? '' : ' (outside filter)'), r.summary, r.result, r.citedBy]),
            }}
          />
        ) : (
          <Muted>No experiments are cited by the included insights, recommendations or items added to this report.</Muted>
        )}
        {data.reportItems.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="eyebrow">Items added to this report</p>
            <ul className="flex flex-col gap-1">
              {data.reportItems.map((it) => (
                <li key={it.id} className="text-sm text-foreground">
                  <span className="font-medium text-ink">{it.title}.</span> {it.detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section n={8} title="Proposed Next Experiments">
        {!data.config.includeRecommendations ? (
          <Muted>Recommendations were excluded from this report configuration.</Muted>
        ) : data.recommendations.length ? (
          <>
            <ul className="flex flex-col gap-3">
              {data.recommendations.map(({ rec, plan, assignee }) => (
                <li key={rec.id} className="flex flex-col gap-1 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      <span className="tnum mr-1.5 text-teal-ink">{rec.id}</span>
                      {rec.title}
                    </p>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{rec.status}</span>
                  </div>
                  <p className="tnum text-xs text-ink">
                    {rec.formulationId}
                    {data.workflow === 'demulsifier' ? ` on ${rec.crudeId}` : ''} · {rec.dosagePpm} ppm
                    {rec.tempC !== null ? ` · ${rec.tempC} °C` : ''}
                    {rec.settlingMin !== null ? ` · ${rec.settlingMin} min` : ''}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">{rec.rationale}</p>
                  {plan ? (
                    <p className="text-xs text-muted-foreground">
                      Testing plan {plan.id}: {plan.status}
                      {assignee ? `, assigned to ${assignee.name}` : ', unassigned'}, planned {fmtDate(plan.plannedDate)}.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            {data.rejectedCount > 0 ? <Muted>{data.rejectedCount} rejected recommendation(s) are not listed.</Muted> : null}
          </>
        ) : (
          <Muted>No open recommendations apply to the selected filters.</Muted>
        )}
      </Section>

      <Section n={9} title="Chemist's Notes">
        {data.notes ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data.notes}</p> : <Muted>No chemist notes were entered for this report.</Muted>}
      </Section>

      <Section n={10} title="Recommended Validation Steps">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-teal">
          {data.validation.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </Section>

      <Section n={11} title="Limitations and Disclaimer">
        <div className="flex flex-col gap-2">
          {REPORT_DISCLAIMER.map((d) => (
            <p key={d} className="text-sm leading-relaxed text-muted-foreground">
              {d}
            </p>
          ))}
        </div>
      </Section>

      <footer className="border-t pt-3 text-xs text-muted-foreground">{REPORT_LABEL}</footer>
    </article>
  )
}

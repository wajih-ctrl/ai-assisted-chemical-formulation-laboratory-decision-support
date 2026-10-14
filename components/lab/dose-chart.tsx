'use client'

import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { DoseSeries, DosePoint } from '@/lib/analysis'
import type { Formulation } from '@/lib/types'

interface Props {
  series: DoseSeries[]
  formulations: Formulation[]
  height?: number
  xLabel?: string
  yLabel?: string
  yDomain?: [number, number]
  onSelect?: (experimentId: string) => void
  selectedId?: string | null
  refX?: number | null
  hideLegend?: boolean
  xName?: string
  xUnit?: string
}

function PointTip({
  active,
  payload,
  xName = 'Dosage',
  xUnit = 'ppm',
}: {
  active?: boolean
  payload?: { payload: DosePoint & { n?: number } }[]
  xName?: string
  xUnit?: string
}) {
  if (!active || !payload?.length) return null
  const p = payload.find((x) => x.payload && x.payload.id)?.payload
  if (!p) return null
  const e = p.exp
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-ink">
        {e.id} · {e.formulationId}
      </p>
      <p className="tnum mt-1 text-ink">
        {xName} {p.x} {xUnit} → <span className="font-semibold">{e.waterSepPct} %</span> water separation
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {e.crudeId} · {e.dosagePpm} ppm · {e.tempC} °C · {e.settlingMin} min
      </p>
      {p.mismatch.length > 0 ? (
        <p className="mt-1.5 rounded bg-amber-soft px-1.5 py-1 text-amber-ink">Differs from reference: {p.mismatch.join('; ')}</p>
      ) : null}
      <p className="mt-1.5 text-muted-foreground">Select to open experiment</p>
    </div>
  )
}

export function DoseResponseChart({
  series,
  formulations,
  height = 320,
  xLabel = 'Chemical dosage (ppm)',
  yLabel = 'Water separation (%)',
  yDomain = [0, 100],
  onSelect,
  selectedId,
  refX,
  hideLegend,
  xName,
  xUnit,
}: Props) {
  const colorOf = (id: string) => formulations.find((f) => f.id === id)?.color ?? '#5b6b82'
  const total = series.reduce((n, s) => n + s.points.length, 0)
  return (
    <div className="w-full">
      <div
        role="img"
        aria-label={`Scatter chart of ${yLabel} against ${xLabel} with ${total} recorded experiments across ${series.length} formulations. A data table follows the chart.`}
        style={{ height }}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 12, right: 18, bottom: 28, left: 6 }}>
          <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            axisLine={{ stroke: '#cfd8e3' }}
            label={{ value: xLabel, position: 'insideBottom', offset: -16, fontSize: 12, fill: '#526174' }}
            allowDecimals={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={yDomain}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            axisLine={{ stroke: '#cfd8e3' }}
            width={44}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 8, fontSize: 12, fill: '#526174', style: { textAnchor: 'middle' } }}
          />
          <Tooltip content={<PointTip xName={xName} xUnit={xUnit} />} cursor={{ stroke: '#cfd8e3' }} isAnimationActive={false} wrapperStyle={{ zIndex: 50 }} allowEscapeViewBox={{ x: true, y: true }} />
          {hideLegend ? null : <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
          {refX != null ? <ReferenceLine x={refX} stroke="#c18a35" strokeDasharray="4 4" label={{ value: 'proposed', fontSize: 11, fill: '#7d5413', position: 'top' }} /> : null}
          {series.map((s) => (
            <Line
              key={`line-${s.formulationId}`}
              data={s.means}
              dataKey="y"
              name={`${s.formulationId} (mean)`}
              stroke={colorOf(s.formulationId)}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive={false}
              tooltipType="none"
            />
          ))}
          {series.map((s) => (
            <Scatter
              key={`sc-${s.formulationId}`}
              data={s.points}
              name={s.formulationId}
              fill={colorOf(s.formulationId)}
              isAnimationActive={false}
              cursor={onSelect ? 'pointer' : 'default'}
              onClick={(d: unknown) => {
                const pt = ((d as { payload?: DosePoint })?.payload ?? d) as DosePoint
                if (pt?.id) onSelect?.(pt.id)
              }}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: DosePoint }
                const c = colorOf(payload.formulationId)
                const mismatch = payload.mismatch.length > 0
                const selected = payload.id === selectedId
                return (
                  <g>
                    {selected ? <circle cx={cx} cy={cy} r={11} fill="none" stroke="#101c2e" strokeWidth={1.5} /> : null}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={mismatch ? 5.5 : 6}
                      fill={mismatch ? '#ffffff' : c}
                      stroke={c}
                      strokeWidth={mismatch ? 2 : 1.5}
                      strokeDasharray={mismatch ? '2 2' : undefined}
                    />
                  </g>
                )
              }}
            />
          ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 rounded-xl border border-border/80 bg-muted/25">
        <summary className="min-h-10 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold text-ink outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/55">
          View chart data as a table
        </summary>
        <div className="overflow-x-auto border-t scroll-thin">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <caption className="sr-only">Recorded values displayed in the {yLabel} against {xLabel} chart</caption>
            <thead className="bg-muted/60 text-xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5">Experiment</th>
                <th scope="col" className="px-3 py-2.5">Formulation</th>
                <th scope="col" className="px-3 py-2.5">{xName ?? 'Dosage'}</th>
                <th scope="col" className="px-3 py-2.5">Water separation</th>
                <th scope="col" className="px-3 py-2.5">Recorded conditions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {series.flatMap((s) => s.points).map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2.5">
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(p.id)} className="tnum inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-ink hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                        {p.id}
                      </button>
                    ) : <span className="tnum font-semibold text-ink">{p.id}</span>}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-ink">{p.formulationId}</td>
                  <td className="tnum px-3 py-2.5">{p.x} {xUnit ?? 'ppm'}</td>
                  <td className="tnum px-3 py-2.5">{p.y} %</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.exp.crudeId} · {p.exp.tempC} °C · {p.exp.settlingMin} min{p.mismatch.length ? ` · differs: ${p.mismatch.join('; ')}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

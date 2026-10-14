'use client'

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { GasolineBlend, GasolineExperiment } from '@/lib/types'

export const COMPONENT_COLORS = ['#087f83', '#4076ba', '#c18a35', '#b4573a', '#5b6b82', '#8aa3b8']

export function componentNames(blends: GasolineBlend[]): string[] {
  const names: string[] = []
  for (const b of blends) for (const c of b.components) if (!names.includes(c.name)) names.push(c.name)
  return names
}

export function CompositionChart({ blends }: { blends: GasolineBlend[] }) {
  const names = componentNames(blends)
  const data = blends.map((b) => {
    const row: Record<string, number | string> = { id: b.id }
    for (const n of names) row[n] = b.components.find((c) => c.name === n)?.pct ?? 0
    return row
  })
  return (
    <div
      role="img"
      aria-label={`Stacked bar chart of base blend composition for ${blends.map((b) => b.id).join(', ')}`}
      style={{ height: 64 + blends.length * 52 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }} barCategoryGap={14}>
          <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v} %`}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            axisLine={{ stroke: '#cfd8e3' }}
          />
          <YAxis type="category" dataKey="id" width={64} tick={{ fontSize: 12, fill: '#101c2e' }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(8,127,131,0.06)' }}
            isAnimationActive={false}
            formatter={(value, name) => [`${value} %`, String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {names.map((n, i) => (
            <Bar key={n} dataKey={n} stackId="blend" fill={COMPONENT_COLORS[i % COMPONENT_COLORS.length]} isAnimationActive={false} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface RonPoint {
  x: number
  y: number
  id: string
  blendId: string
  additive: string
  date: string
}

export interface RonSeries {
  blendId: string
  color: string
  points: RonPoint[]
}

function RonTip({ active, payload }: { active?: boolean; payload?: { payload: RonPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload.find((x) => x.payload && x.payload.id)?.payload
  if (!p) return null
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-ink">
        {p.id} · {p.blendId}
      </p>
      <p className="tnum mt-1 text-ink">
        {p.x} ppm → <span className="font-semibold">{p.y.toFixed(1)}</span> measured RON
      </p>
      <p className="mt-0.5 text-muted-foreground">{p.additive}</p>
      <p className="mt-1.5 text-muted-foreground">Select to open experiment</p>
    </div>
  )
}

export function RonChart({
  series,
  onSelect,
  height = 340,
}: {
  series: RonSeries[]
  onSelect: (id: string) => void
  height?: number
}) {
  const all = series.flatMap((s) => s.points.map((p) => p.y))
  const min = all.length ? Math.floor(Math.min(...all) - 0.5) : 88
  const max = all.length ? Math.ceil(Math.max(...all) + 0.5) : 96
  const total = all.length
  const xTicks = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort((a, b) => a - b)
  const yTicks = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div
      role="img"
      aria-label={`Scatter chart of measured RON against booster dosage with ${total} recorded experiments across ${series.length} blends`}
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 12, right: 18, bottom: 28, left: 6 }}>
          <CartesianGrid stroke="#e2e8ef" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-20, 'dataMax + 20']}
            ticks={xTicks}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            axisLine={{ stroke: '#cfd8e3' }}
            label={{ value: 'Booster / additive dosage (ppm)', position: 'insideBottom', offset: -16, fontSize: 12, fill: '#526174' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[min, max]}
            ticks={yTicks}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#526174' }}
            tickLine={false}
            axisLine={{ stroke: '#cfd8e3' }}
            width={48}
            label={{ value: 'Measured RON', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12, fill: '#526174', style: { textAnchor: 'middle' } }}
          />
          <Tooltip content={<RonTip />} cursor={{ stroke: '#cfd8e3' }} isAnimationActive={false} wrapperStyle={{ zIndex: 50 }} allowEscapeViewBox={{ x: true, y: true }} />
          <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={`line-${s.blendId}`}
              data={s.points}
              dataKey="y"
              stroke={s.color}
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
              key={`sc-${s.blendId}`}
              data={s.points}
              name={s.blendId}
              fill={s.color}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(d: unknown) => {
                const pt = ((d as { payload?: RonPoint })?.payload ?? d) as RonPoint
                if (pt?.id) onSelect(pt.id)
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ronPointsFor(exps: GasolineExperiment[], additiveName: (id: string) => string): RonPoint[] {
  return exps
    .filter((e) => e.ron !== null && e.boosterPpm !== null && (e.status === 'Completed' || e.status === 'Under Review'))
    .map((e) => ({
      x: e.boosterPpm as number,
      y: e.ron as number,
      id: e.id,
      blendId: e.blendId,
      additive: additiveName(e.additiveType),
      date: e.testDate,
    }))
    .sort((a, b) => a.x - b.x)
}

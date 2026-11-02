/**
 * Benchmarking visualiser.
 *
 * Payload length (X) against execution cost (Y) for the DFA engine and the
 * vulnerable backtracking engine, so the flat O(n) line and the bending O(2ⁿ)
 * curve are visible in the same frame.
 *
 * Design notes (data-viz rules):
 *  - ONE y-axis, never two. The DFA's times are microseconds while the
 *    backtracking engine's reach seconds, so the axis is logarithmic: a
 *    linear axis would flatten the DFA line into the baseline and hide the
 *    very thing the chart exists to show.
 *  - The "Steps" toggle is an alternative measure of the same comparison on
 *    the same axis, not a second scale.
 *  - 2px lines, >=8px markers, hairline solid gridlines, legend always
 *    present, and a table-view twin so no value is reachable only by hover.
 *  - The chart sits on the white card surface; the axis text is soft grey.
 */

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BenchmarkRow } from '../types'

interface Props {
  rows: BenchmarkRow[]
  running: boolean
}

type Metric = 'time' | 'steps'

interface Point {
  length: number
  dfa: number
  backtrack: number
  dfaSteps: number
  backtrackSteps: number
  row: BenchmarkRow
}

const AXIS_STYLE = { fontSize: 11 }

export default function BenchmarkChart({ rows, running }: Props) {
  const [metric, setMetric] = useState<Metric>('time')
  const [showTable, setShowTable] = useState(false)

  const data: Point[] = useMemo(
    () =>
      rows.map((row) => ({
        length: row.length,
        dfa: metric === 'time' ? Math.max(row.dfa_ms, 0.0001) : row.dfa_steps,
        backtrack:
          metric === 'time' ? Math.max(row.backtrack_ms, 0.0001) : row.backtrack_steps,
        dfaSteps: row.dfa_steps,
        backtrackSteps: row.backtrack_steps,
        row,
      })),
    [rows, metric],
  )

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center font-mono text-xs text-slate-400">
        <span>
          <span className="text-emerald-600">$</span> no telemetry yet — run a stress
          test to plot the complexity curves
        </span>
      </div>
    )
  }

  const last = data[data.length - 1]
  const ratio = last && last.dfa > 0 ? last.backtrack / last.dfa : null

  const metricToggle = (key: Metric, label: string) => {
    const active = metric === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => setMetric(key)}
        aria-pressed={active}
        className={
          'rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ' +
          (active
            ? 'border-accent/40 bg-accent-soft text-accent'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700')
        }
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Complexity Curve
          </h2>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            payload length vs execution cost · log scale
            {ratio !== null && (
              <>
                {' '}
                · backtracking is{' '}
                <span className="text-rose-600">
                  {ratio >= 1000
                    ? `${(ratio / 1000).toFixed(1)}k×`
                    : `${ratio.toFixed(0)}×`}
                </span>{' '}
                costlier at n={last.length}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1" role="group" aria-label="Select metric">
            {metricToggle('time', 'time (ms)')}
            {metricToggle('steps', 'steps')}
          </div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            {showTable ? 'chart' : 'table'}
          </button>
        </div>
      </header>

      {showTable ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse font-mono text-[11px]">
            <caption className="sr-only">Benchmark results as a table</caption>
            <thead className="sticky top-0">
              <tr>
                {['n', 'DFA ms', 'DFA steps', 'Backtrack ms', 'Backtrack steps', 'Native re'].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.length} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-slate-700">
                    {r.length}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-emerald-700">
                    {r.dfa_ms.toFixed(4)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-emerald-700">
                    {r.dfa_steps.toLocaleString()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-rose-700">
                    {r.backtrack_ms.toFixed(3)}
                    {r.backtrack_aborted && (
                      <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                        aborted
                      </span>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-rose-700">
                    {r.backtrack_steps.toLocaleString()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-1.5 tabular-nums text-amber-700">
                    {r.native_ms === null
                      ? '—'
                      : `${r.native_ms.toFixed(3)}${r.native_aborted ? ' (timeout)' : ''}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 transition-opacity duration-150"
          style={{ opacity: running ? 0.55 : 1 }}
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 20, bottom: 24, left: 0 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="length"
                type="number"
                scale="log"
                domain={['auto', 'auto']}
                tick={{ ...AXIS_STYLE, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{
                  value: 'payload length (n)',
                  position: 'insideBottom',
                  offset: -16,
                  style: { fontSize: 10, fill: '#94a3b8' },
                }}
              />
              <YAxis
                scale="log"
                domain={['auto', 'auto']}
                tick={{ ...AXIS_STYLE, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                width={54}
                tickFormatter={(v: number) =>
                  metric === 'time'
                    ? v >= 1000
                      ? `${(v / 1000).toFixed(0)}s`
                      : v >= 1
                        ? `${v.toFixed(0)}ms`
                        : `${v.toFixed(3)}ms`
                    : v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : `${v}`
                }
                label={{
                  value: metric === 'time' ? 'execution time (ms)' : 'backtracking steps',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: '#94a3b8' },
                }}
              />
              <Tooltip
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                content={<ChartTooltip metric={metric} />}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={26}
                iconType="plainline"
                iconSize={16}
                wrapperStyle={{ fontSize: 11, color: '#475569' }}
              />

              {/* Vulnerable engine first so the DFA line draws on top of it. */}
              <Line
                type="monotone"
                dataKey="backtrack"
                name="Vulnerable backtracking"
                stroke="#e34948"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: '#e34948', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#e34948', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="dfa"
                name="DFA engine (Powerset)"
                stroke="#0f8f66"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: '#0f8f66', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#0f8f66', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-slate-400">
        Both axes are logarithmic. A linear y-axis would hide the DFA line: its cost
        is so small it would sit on the baseline — which is the point. The DFA does
        one table lookup per character, whatever the regex looks like.
      </p>
    </div>
  )
}

/**
 * Custom tooltip. Shows both the plotted metric and the underlying step
 * count, so the reader can connect the curve to the algorithmic claim.
 */
function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: { dataKey?: string; value?: number; payload?: Point }[]
  label?: number
  metric: Metric
}) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload as Point | undefined
  const time = metric === 'time'

  const line = (swatch: string, name: string, value: string, sub?: string) => (
    <div className="flex items-start gap-2 py-0.5">
      <span
        aria-hidden="true"
        className="mt-1 h-0.5 w-3 shrink-0 rounded-full"
        style={{ background: swatch }}
      />
      <span className="flex-1">
        <span className="block text-slate-500">{name}</span>
        <span className="block font-mono font-medium text-slate-700">{value}</span>
        {sub && <span className="block font-mono text-[10px] text-slate-400">{sub}</span>}
      </span>
    </div>
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] shadow-md">
      <div className="mb-1.5 font-semibold text-slate-700">n = {label}</div>
      {line(
        '#e34948',
        'Vulnerable backtracking',
        time
          ? `${(point?.backtrack ?? 0).toFixed(3)} ms`
          : `${(point?.backtrackSteps ?? 0).toLocaleString()} steps`,
        time ? `${(point?.backtrackSteps ?? 0).toLocaleString()} steps` : undefined,
      )}
      {line(
        '#0f8f66',
        'DFA engine (Powerset)',
        time
          ? `${(point?.dfa ?? 0).toFixed(4)} ms`
          : `${(point?.dfaSteps ?? 0).toLocaleString()} steps`,
        time ? `${(point?.dfaSteps ?? 0).toLocaleString()} steps` : undefined,
      )}
      {point?.row.backtrack_aborted && (
        <div className="mt-1.5 rounded-md bg-rose-50 px-1.5 py-1 text-[10px] font-semibold text-rose-700">
          Backtracking engine aborted — step budget exhausted
        </div>
      )}
    </div>
  )
}

/**
 * Metrics card — Asymptotic complexity comparison.
 *
 * "DFA ENGINE: O(n)" and "BACKTRACKING: O(2ⁿ)" dual view.
 * Perfectly calibrated for both Light (cream/beige) and Dark (obsidian/bronze).
 */

interface Props {
  dfaSteps: number | null
  dfaMs: number | null
  nativeSteps: number | null
  nativeMs: number | null
  nativeAborted: boolean
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  if (ms >= 1) return `${ms.toFixed(1)} ms`
  return `${ms.toFixed(3)} ms`
}

function formatSteps(steps: number | null): string {
  if (steps === null) return '—'
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}K`
  return String(steps)
}

function formatPending(value: string, pending: boolean): string {
  return pending ? value : '—'
}

export default function MetricsCard({
  dfaSteps,
  dfaMs,
  nativeSteps,
  nativeMs,
  nativeAborted,
}: Props) {
  const pending = dfaSteps === null && nativeSteps === null && dfaMs === null && nativeMs === null

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* ── DFA engine: O(n) Safe ── */}
      <div
        className="rounded-2xl p-4 flex flex-col justify-between theme-transition"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-green)' }}>
              DFA Engine
            </span>
          </div>
          <div className="font-mono text-3xl font-black leading-tight" style={{ color: 'var(--accent-green)' }}>
            O(n)
          </div>
          <div className="text-[11px] font-medium" style={{ color: 'var(--text-lo)' }}>
            Linear-Time Guaranteed
          </div>
        </div>

        <div className="mt-4 pt-3 border-t space-y-1 font-mono text-[11px]" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-md)' }}>steps</span>
            <span className="font-bold" style={{ color: 'var(--accent-green)' }}>
              {formatPending(formatSteps(dfaSteps), pending)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-md)' }}>time</span>
            <span className="font-bold" style={{ color: 'var(--accent-green)' }}>
              {formatPending(formatMs(dfaMs), pending)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Backtracking engine: O(2ⁿ) Vulnerable ── */}
      <div
        className="rounded-2xl p-4 flex flex-col justify-between theme-transition"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-red)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-red)' }}>
              Backtracker
            </span>
          </div>
          <div className="font-mono text-3xl font-black leading-tight" style={{ color: 'var(--accent-red)' }}>
            O(2ⁿ)
          </div>
          <div className="text-[11px] font-medium" style={{ color: 'var(--text-lo)' }}>
            Exponential ReDoS Risk
          </div>
        </div>

        <div className="mt-4 pt-3 border-t space-y-1 font-mono text-[11px]" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-md)' }}>steps</span>
            <span className="font-bold" style={{ color: 'var(--accent-red)' }}>
              {formatPending(formatSteps(nativeSteps), pending)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-md)' }}>time</span>
            <span className="font-bold" style={{ color: 'var(--accent-red)' }}>
              {pending ? 'Run stress test' : nativeAborted ? 'ABORTED' : formatMs(nativeMs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

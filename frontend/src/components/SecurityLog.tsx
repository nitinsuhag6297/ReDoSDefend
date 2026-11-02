/**
 * Live console — Dual-Theme engine event log.
 */

import { useEffect, useRef } from 'react'
import type { LogEntry } from '../types'

interface Props {
  entries: LogEntry[]
  onClear: () => void
}

const TAG: Record<LogEntry['level'], { label: string; color: string; bg: string }> = {
  info:     { label: 'INFO',   color: 'var(--accent-cyan)',   bg: 'var(--accent-cyan-dim)' },
  good:     { label: 'SECURE', color: 'var(--accent-green)',  bg: 'var(--accent-green-dim)' },
  warn:     { label: 'WARN',   color: 'var(--accent-amber)',  bg: 'var(--accent-amber-dim)' },
  critical: { label: 'ALERT',  color: 'var(--accent-red)',    bg: 'var(--accent-red-dim)' },
}

export default function SecurityLog({ entries, onClear }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length])

  return (
    <div className="flex h-full flex-col theme-transition" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-red)' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-amber)' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
          </div>
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-md)' }}>
            waf-engine-console — live security stream
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border)',
            color: 'var(--text-md)',
          }}
        >
          Clear
        </button>
      </div>

      {/* Console body */}
      <div
        className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed space-y-1.5"
        role="log"
        aria-live="polite"
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        {entries.length === 0 ? (
          <div style={{ color: 'var(--text-lo)' }}>
            <span style={{ color: 'var(--accent-green)' }}>$</span> Awaiting automata events…
            Compile a regex or run a stress test to view real-time state execution.
          </div>
        ) : (
          entries.map((entry) => {
            const tag = TAG[entry.level]
            return (
              <div key={entry.id} className="flex gap-2.5 items-start">
                <span className="shrink-0 font-medium" style={{ color: 'var(--text-lo)' }}>
                  {entry.timestamp}
                </span>
                <span
                  className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold"
                  style={{ color: tag.color, backgroundColor: tag.bg }}
                >
                  [{tag.label}]
                </span>
                <span className="break-all" style={{ color: 'var(--text-hi)' }}>
                  {entry.message}
                </span>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

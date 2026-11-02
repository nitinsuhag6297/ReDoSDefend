/**
 * App — Premium ReDoS-Proof Automata Engine.
 *
 * Fully supports dual themes:
 * - Light Mode: Clean, elegant palette of cream, ivory, beige, light brown, and subtle neutrals.
 * - Dark Mode: Sophisticated dark obsidian & charcoal backgrounds with comfortable contrast.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { compileRegex, matchPayload, runBenchmark } from './api'
import AutomatonInsight from './components/AutomatonInsight'
import BenchmarkChart from './components/BenchmarkChart'
import ControlPanel from './components/ControlPanel'
import DfaTable from './components/DfaTable'
import DualBenchmarkChart from './components/DualBenchmarkChart'
import MetricsCard from './components/MetricsCard'
import SecurityLog from './components/SecurityLog'
import Sidebar from './components/Sidebar'
import type { BenchmarkResponse, CompileResponse, LogEntry, MatchResponse } from './types'
import WorkflowView from './views/WorkflowInfographic'

type View = '/' | '/control-panel' | '/matrix' | '/benchmark' | '/security-log' | '/workflow'
type Theme = 'light' | 'dark'

/* ── Log helpers ────────────────────────────────────────────────────── */
let _id = 0
const mkLog = (level: LogEntry['level'], message: string): LogEntry => ({
  id: ++_id,
  timestamp: new Date().toLocaleTimeString(),
  level,
  message,
})

/* ── Animated counter hook ──────────────────────────────────────────── */
function useCountUp(target: number | null, dur = 800) {
  const [val, setVal] = useState(0)
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (target === null) { setVal(0); return }
    if (target === prev.current) return
    prev.current = target
    const start = Date.now()
    const from = val
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, dur])
  return val
}

/* ── Typewriter hook ────────────────────────────────────────────────── */
const DEMO_PATTERNS = [
  '^(a+)+$',
  '^(a|aa)+$',
  '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
  '^(ab+){3,}$'
]

function useTypewriter() {
  const [display, setDisplay] = useState('')
  const [pi, setPi] = useState(0)
  const [ci, setCi] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const target = DEMO_PATTERNS[pi]
    const delay = deleting ? 40 : ci === target.length ? 1800 : 75
    const t = setTimeout(() => {
      if (!deleting && ci < target.length) {
        setDisplay(target.slice(0, ci + 1))
        setCi(c => c + 1)
      } else if (!deleting && ci === target.length) {
        setDeleting(true)
      } else if (deleting && display.length > 0) {
        setDisplay(d => d.slice(0, -1))
      } else {
        setDeleting(false)
        setCi(0)
        setPi(p => (p + 1) % DEMO_PATTERNS.length)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [ci, pi, deleting, display])
  return display
}

/* ════════════════════════════════════════════════════════════════════
   HERO DFA DIAGRAM (Dual-Theme Adaptive & Fully Contained)
   ════════════════════════════════════════════════════════════════════ */
function HeroDFA() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full select-none" aria-hidden="true">
      <defs>
        <marker id="arr-teal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="var(--accent-cyan)" />
        </marker>
        <marker id="arr-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="var(--accent-green)" />
        </marker>
        <marker id="arr-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="var(--accent-red)" />
        </marker>
        <marker id="arr-muted" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="var(--text-lo)" />
        </marker>
      </defs>

      {/* Entry into q0 */}
      <line x1="16" y1="70" x2="48" y2="70" stroke="var(--accent-cyan)" strokeWidth="2" markerEnd="url(#arr-teal)" />

      {/* Edge q0 → q1 : "a" */}
      <line x1="102" y1="70" x2="192" y2="70" stroke="var(--accent-cyan)" strokeWidth="2"
            strokeDasharray="8 4" markerEnd="url(#arr-teal)" className="edge-flow-1" />
      <text x="146" y="62" textAnchor="middle" fill="var(--accent-cyan)" fontSize="11"
            fontFamily="ui-monospace, monospace" fontWeight="700">a</text>

      {/* Edge q0 → q2 : "other" */}
      <path d="M84,94 C96,128 126,144 140,148" stroke="var(--text-lo)"
            strokeWidth="1.6" fill="none" strokeDasharray="6 4"
            markerEnd="url(#arr-muted)" className="edge-flow-4" />
      <text x="100" y="132" textAnchor="middle" fill="var(--text-lo)"
            fontSize="9" fontFamily="ui-monospace, monospace">other</text>

      {/* Self-loop q1 → q1 : "a" */}
      <path d="M214,48 A18 18 0 1,1 234,48" stroke="var(--accent-green)" strokeWidth="2"
            fill="none" strokeDasharray="6 3" markerEnd="url(#arr-green)"
            className="edge-flow-3" />
      <text x="244" y="28" textAnchor="middle" fill="var(--accent-green)" fontSize="11"
            fontFamily="ui-monospace, monospace" fontWeight="700">a</text>

      {/* Edge q1 → q2 : "other" */}
      <path d="M216,94 C204,128 174,144 160,148" stroke="var(--text-lo)"
            strokeWidth="1.6" fill="none" strokeDasharray="6 4"
            markerEnd="url(#arr-muted)" className="edge-flow-2" />
      <text x="200" y="132" fill="var(--text-lo)" fontSize="9"
            fontFamily="ui-monospace, monospace">other</text>

      {/* Self-loop q2 → q2 */}
      <path d="M140,166 A15 15 0 1,0 160,166" stroke="var(--accent-red)" strokeWidth="1.8"
            fill="none" strokeDasharray="5 3" markerEnd="url(#arr-red)"
            className="edge-flow-5" />

      {/* ── q0 node (START) ── */}
      <g>
        <circle cx="75" cy="70" r="26" fill="var(--accent-cyan-dim)"
                stroke="var(--accent-cyan)" strokeWidth="2.5" />
        <text x="75" y="67" textAnchor="middle" fill="var(--accent-cyan)"
              fontSize="13" fontWeight="800" fontFamily="ui-monospace, monospace">q₀</text>
        <text x="75" y="79" textAnchor="middle" fill="var(--accent-cyan)"
              fontSize="7.5" fontWeight="700" fontFamily="ui-monospace, monospace" letterSpacing="1">START</text>
      </g>

      {/* ── q1 node (ACCEPT - double ring) ── */}
      <g>
        <circle cx="225" cy="70" r="30" fill="none"
                stroke="var(--accent-green)" strokeWidth="1.8" strokeDasharray="4 2" />
        <circle cx="225" cy="70" r="24" fill="var(--accent-green-dim)"
                stroke="var(--accent-green)" strokeWidth="2.5" />
        <text x="225" y="67" textAnchor="middle" fill="var(--accent-green)"
              fontSize="13" fontWeight="800" fontFamily="ui-monospace, monospace">q₁</text>
        <text x="225" y="79" textAnchor="middle" fill="var(--accent-green)"
              fontSize="7.5" fontWeight="700" fontFamily="ui-monospace, monospace" letterSpacing="1">ACCEPT</text>
      </g>

      {/* ── q2 node (DEAD/TRAP) ── */}
      <g>
        <circle cx="150" cy="150" r="22" fill="var(--accent-red-dim)"
                stroke="var(--accent-red)" strokeWidth="2.5" />
        <text x="150" y="147" textAnchor="middle" fill="var(--accent-red)"
              fontSize="12" fontWeight="800" fontFamily="ui-monospace, monospace">q₂</text>
        <text x="150" y="158" textAnchor="middle" fill="var(--accent-red)"
              fontSize="7" fontWeight="700" fontFamily="ui-monospace, monospace" letterSpacing="1">TRAP</text>
      </g>
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════════
   KPI CARD (Dual-Theme Adaptive & Interactive)
   ════════════════════════════════════════════════════════════════════ */
interface KpiProps {
  label: string
  rawValue: number | null
  format?: (n: number) => string
  sub?: string
  accent: string
  icon: string
  actionLabel?: string
  onClick?: () => void
}

function KpiCard({ label, rawValue, format, sub, accent, icon, actionLabel, onClick }: KpiProps) {
  const count = useCountUp(rawValue)
  const displayed = rawValue === null ? null : format ? format(count) : String(count)
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-opacity-60' : ''
      }`}
      style={{ backgroundColor: 'var(--surface-1)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-md)' }}>
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>

      <div className="my-2 min-h-[36px] flex items-center">
        {displayed !== null ? (
          <div className="font-mono text-3xl font-black leading-none" style={{ color: accent }}>
            {displayed}
          </div>
        ) : actionLabel ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              color: accent,
              border: '1px solid var(--border-md)',
            }}
          >
            {actionLabel}
          </span>
        ) : (
          <div className="font-mono text-3xl font-black leading-none" style={{ color: accent }}>
            —
          </div>
        )}
      </div>

      {sub && (
        <div className="text-[11px] font-mono truncate pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-lo)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   HEADER WITH DUAL THEME TOGGLE
   ════════════════════════════════════════════════════════════════════ */
function PageHeader({
  title,
  sub,
  theme,
  onToggleTheme,
  children,
}: {
  title: string
  sub?: string
  theme: Theme
  onToggleTheme: () => void
  children?: React.ReactNode
}) {
  return (
    <header
      className="flex items-center justify-between px-8 py-4 flex-shrink-0 theme-transition border-b"
      style={{
        backgroundColor: 'var(--surface-1)',
        borderColor: 'var(--border)',
      }}
    >
      <div>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-hi)' }}>
          {title}
        </h1>
        {sub && <p className="text-xs font-mono" style={{ color: 'var(--text-md)' }}>{sub}</p>}
      </div>

      <div className="flex items-center gap-3">
        {children}

        {/* Global theme switcher button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 border"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border-md)',
            color: 'var(--text-hi)',
          }}
        >
          <span style={{ color: 'var(--accent-primary)' }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
          <span className="capitalize">{theme}</span>
        </button>
      </div>
    </header>
  )
}

/* ════════════════════════════════════════════════════════════════════
   WAF MATCH TESTER
   ════════════════════════════════════════════════════════════════════ */
function MatchTester({
  pattern,
  onResult,
}: {
  pattern: string
  onResult: (r: MatchResponse | null, e: string | null) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<MatchResponse | null>(null)

  const test = useCallback(async () => {
    if (!pattern || !text) return
    setBusy(true)
    setResult(null)
    try {
      const r = await matchPayload(pattern, text)
      setResult(r)
      onResult(r, null)
    } catch (e) {
      onResult(null, String(e))
    } finally {
      setBusy(false)
    }
  }, [pattern, text, onResult])

  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col gap-3.5"
      style={{ backgroundColor: 'var(--surface-1)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--accent-cyan)' }}>🛡️</span>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-md)' }}>
          WAF Filter — Live Test
        </h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && test()}
          placeholder="Enter input string to test…"
          spellCheck={false}
          className="flex-1 theme-input rounded-xl px-3.5 py-2 text-sm"
        />
        <button
          type="button"
          onClick={test}
          disabled={busy || !pattern || !text}
          className="btn-primary px-4 py-2 rounded-xl text-xs font-bold uppercase disabled:opacity-40"
        >
          {busy ? '…' : 'Test'}
        </button>
      </div>

      {result && (
        <div
          className="rounded-xl px-4 py-3 text-xs font-mono border"
          style={{
            backgroundColor: result.allowed ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            borderColor: result.allowed ? 'var(--accent-green)' : 'var(--accent-red)',
          }}
        >
          <div className="font-bold text-sm mb-1" style={{ color: result.allowed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {result.allowed ? '✓ ALLOWED' : '✗ BLOCKED'}
          </div>
          <div style={{ color: 'var(--text-hi)' }}>{result.reason}</div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-md)' }}>
            {result.dfa_steps} steps · {result.elapsed_ms.toFixed(4)} ms · {result.dfa_state_count} states
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   REDOS WARNING PANEL
   ════════════════════════════════════════════════════════════════════ */
function ReDoSWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        backgroundColor: 'var(--accent-red-dim)',
        borderColor: 'var(--accent-red)',
      }}
    >
      <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--accent-red)' }}>
        <span>⚠️</span>
        <span>ReDoS Risk Warnings Detected</span>
      </div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-xs font-mono flex items-start gap-2" style={{ color: 'var(--text-hi)' }}>
            <span style={{ color: 'var(--accent-red)' }}>•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Theme state ── */
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('waf-theme') as Theme | null
    if (saved === 'light' || saved === 'dark') return saved
    return 'light' // Default to requested cream/beige light mode
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('waf-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  /* ── Routing ── */
  const [view, setView] = useState<View>('/')
  const [displayView, setDisplayView] = useState<View>('/')
  const [transitioning, setTransitioning] = useState(false)

  const navigate = useCallback((href: string) => {
    if (href === view) return
    setTransitioning(true)
    setTimeout(() => {
      setDisplayView(href as View)
      setView(href as View)
      setTransitioning(false)
    }, 150)
  }, [view])

  /* ── Form state ── */
  const [pattern, setPattern] = useState('^(a+)+$')
  const [prefix, setPrefix] = useState('a')
  const [suffix, setSuffix] = useState('!')
  const [maxLen, setMaxLen] = useState(24)

  /* ── Async state ── */
  const [compiling, setCompiling] = useState(false)
  const [benchmarking, setBenchmarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Data ── */
  const [compiled, setCompiled] = useState<CompileResponse | null>(null)
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [matrixMode, setMatrixMode] = useState<'graph' | 'split' | 'table'>('split')

  // Auto-compile default pattern on initial load so states & diagram are immediately visible
  useEffect(() => {
    compileRegex(pattern)
      .then((r) => {
        setCompiled(r)
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
      })
  }, [])

  const typed = useTypewriter()

  const push = useCallback((level: LogEntry['level'], msg: string) => {
    setLogs((p) => [...p.slice(-499), mkLog(level, msg)])
  }, [])

  /* ── Actions ── */
  const handleCompile = useCallback(async () => {
    if (!pattern || compiling) return
    setCompiling(true)
    setError(null)
    push('info', `Compiling regex: ${pattern}`)
    try {
      const r = await compileRegex(pattern)
      setCompiled(r)
      r.redos_warnings.forEach((w) => push('warn', `ReDoS warning: ${w}`))
      if (!r.redos_warnings.length) {
        push('good', `Compiled cleanly — ${r.state_count} DFA states, ${r.nfa_state_count} NFA states (${r.compile_ms.toFixed(2)} ms)`)
      }
      navigate('/matrix')
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      setError(m)
      push('critical', `Compilation error: ${m}`)
    } finally {
      setCompiling(false)
    }
  }, [pattern, compiling, push, navigate])

  const handleBenchmark = useCallback(async () => {
    if (!pattern || benchmarking) return
    setBenchmarking(true)
    setError(null)
    push('info', `Stress test started — pattern: ${pattern}, max_n: ${maxLen}`)
    try {
      const r = await runBenchmark({
        pattern,
        prefix,
        suffix,
        min_length: 10,
        max_length: maxLen,
        step_budget: 25_000_000,
        native_timeout_ms: 2500,
        include_native: true,
      })
      setBenchmark(r)
      const last = r.rows[r.rows.length - 1]
      if (last?.backtrack_aborted) {
        push('critical', `ABORTED at n=${last.length} — Backtracking hit 50M safety limit (ReDoS confirmed!)`)
      } else {
        push('good', `Benchmark completed — ${r.rows.length} payload lengths tested (${r.verdict})`)
      }
      navigate('/benchmark')
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      setError(m)
      push('critical', `Benchmark failure: ${m}`)
    } finally {
      setBenchmarking(false)
    }
  }, [pattern, prefix, suffix, maxLen, benchmarking, push, navigate])

  const handleMatchResult = useCallback((r: MatchResponse | null, err: string | null) => {
    if (err) {
      push('critical', `WAF test failed: ${err}`)
      return
    }
    if (r) {
      push(
        r.allowed ? 'good' : 'critical',
        `WAF [${r.allowed ? 'ALLOW' : 'BLOCK'}] "${r.text_preview}" — ${r.reason} (${r.dfa_steps} steps)`
      )
    }
  }, [push])

  const lastRow = benchmark?.rows[benchmark.rows.length - 1] ?? null

  return (
    <div className="flex h-screen overflow-hidden theme-transition" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar with dual theme toggle */}
      <Sidebar
        active={view}
        onNavigate={navigate}
        logCount={logs.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main workspace */}
      <main className="ml-60 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          key={displayView}
          className="flex-1 flex flex-col min-h-0 overflow-hidden theme-transition"
          style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.15s ease' }}
        >

          {/* ══════════════════════════════════════════════════════
              DASHBOARD
              ══════════════════════════════════════════════════════ */}
          {displayView === '/' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-auto">
              {/* Hero Banner */}
              <div
                className="relative overflow-hidden flex-shrink-0 border-b theme-transition px-8 py-8"
                style={{
                  backgroundColor: 'var(--surface-1)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="absolute inset-0 bg-subtle-grid opacity-70 pointer-events-none" />

                <div className="relative flex items-center justify-between gap-8">
                  {/* Left: Headline & Controls */}
                  <div className="flex-1 min-w-0 max-w-2xl">
                    <div className="warm-badge mb-3">
                      <span className="w-2 h-2 rounded-full animate-soft-pulse" style={{ backgroundColor: 'var(--accent-green)' }} />
                      ReDoS‑Hardened DFA Security Engine
                    </div>

                    <h1 className="text-4xl font-black leading-tight tracking-tight mb-2">
                      <span className="text-gradient-warm">Deterministic Automata</span>
                      <br />
                      <span style={{ color: 'var(--text-hi)' }}>Linear-Time Defense</span>
                    </h1>

                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-md)' }}>
                      Transforms any vulnerable regular expression into an <strong style={{ color: 'var(--accent-green)' }}>O(n) deterministic finite automaton</strong> via
                      Thompson's construction and Powerset subsetting. Completely neutralizes exponential <strong style={{ color: 'var(--accent-red)' }}>ReDoS catastrophic backtracking</strong>.
                    </p>

                    {/* Interactive typewriter pattern preview */}
                    <div
                      className="mb-5 font-mono text-xs px-3.5 py-2 rounded-xl w-fit flex items-center gap-2 border shadow-sm"
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        borderColor: 'var(--border-md)',
                        color: 'var(--text-hi)',
                      }}
                    >
                      <span style={{ color: 'var(--accent-primary)' }}>regex:</span>
                      <span className="font-bold">{typed}</span>
                      <span className="animate-pulse" style={{ color: 'var(--accent-primary)' }}>|</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCompile}
                        disabled={compiling || benchmarking}
                        className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                      >
                        {compiling ? 'Compiling…' : '⚡ Compile DFA'}
                      </button>

                      <button
                        type="button"
                        onClick={handleBenchmark}
                        disabled={compiling || benchmarking}
                        className="btn-danger-warm px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                      >
                        {benchmarking ? 'Running…' : '🔥 Stress Test'}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/workflow')}
                        className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                      >
                        📐 View Pipeline
                      </button>
                    </div>
                    {error && (
                      <div
                        role="alert"
                        className="mt-4 max-w-2xl rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700"
                      >
                        <span className="mr-1.5 font-bold">[ALERT]</span>
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Right: SVG Diagram */}
                  <div className="flex-shrink-0 w-80 h-56 hidden lg:block">
                    <HeroDFA />
                  </div>
                </div>
              </div>

              {/* Body: KPIs & Panels */}
              <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
                {/* 4 KPI cards */}
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <KpiCard
                    label="DFA States"
                    rawValue={compiled?.state_count ?? null}
                    sub={compiled ? `${compiled.nfa_state_count} NFA states` : 'Compile to measure'}
                    accent="var(--accent-cyan)"
                    icon="⚛️"
                  />
                  <KpiCard
                    label="Compile Time"
                    rawValue={compiled ? Math.round(compiled.compile_ms * 100) / 100 : null}
                    format={(n) => `${(n / 100).toFixed(2)} ms`}
                    sub={compiled?.pattern ? `Pattern: ${compiled.pattern}` : 'Fast preemption'}
                    accent="var(--accent-green)"
                    icon="⚡"
                  />
                  <KpiCard
                    label="Max Backtrack Steps"
                    rawValue={benchmark?.totals.max_backtrack_steps ?? null}
                    format={(n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n))}
                    sub={lastRow?.backtrack_aborted ? 'ABORTED (Budget Hit)' : 'Stress test metric'}
                    accent="var(--accent-red)"
                    icon="💀"
                  />
                  <KpiCard
                    label="DFA Speedup"
                    rawValue={benchmark?.totals.aggregate_speedup ?? null}
                    format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k×` : `${n.toFixed(0)}×`)}
                    sub="vs Backtracking"
                    accent="var(--accent-primary)"
                    icon="🚀"
                  />
                </div>

                {/* Warnings */}
                {compiled && <ReDoSWarnings warnings={compiled.redos_warnings} />}

                {/* Dual view: Complexity comparison + Live Matcher */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <MetricsCard
                    dfaSteps={lastRow?.dfa_steps ?? null}
                    dfaMs={lastRow?.dfa_ms ?? null}
                    nativeSteps={lastRow?.native_aborted ? null : (lastRow?.backtrack_steps ?? null)}
                    nativeMs={lastRow?.native_ms ?? null}
                    nativeAborted={lastRow?.native_aborted ?? false}
                  />
                  <MatchTester pattern={compiled?.pattern ?? pattern} onResult={handleMatchResult} />
                </div>

                {/* Mini Benchmark Chart preview */}
                {benchmark && benchmark.rows.length > 0 && (
                  <div className="glass-card rounded-2xl p-5" style={{ backgroundColor: 'var(--surface-1)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-md)' }}>
                        Complexity Curve Preview
                      </h3>
                      <span className="warm-badge text-[10px]">
                        {benchmark.verdict}
                      </span>
                    </div>
                    <div className="h-56">
                      <BenchmarkChart rows={benchmark.rows} running={benchmarking} />
                    </div>
                  </div>
                )}

                {/* Recent Event Log snippet */}
                {logs.length > 0 && (
                  <div className="glass-card rounded-2xl p-5" style={{ backgroundColor: 'var(--surface-1)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-md)' }}>
                        Recent Engine Logs
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/security-log')}
                        className="text-xs font-bold hover:underline"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        View all →
                      </button>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {logs.slice(-4).map((e) => (
                        <div key={e.id} className="flex gap-2 items-start">
                          <span style={{ color: 'var(--text-lo)' }} className="shrink-0">{e.timestamp}</span>
                          <span className="font-bold uppercase text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--accent-primary)' }}>
                            [{e.level}]
                          </span>
                          <span className="truncate" style={{ color: 'var(--text-hi)' }}>{e.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              CONTROL PANEL
              ══════════════════════════════════════════════════════ */}
          {displayView === '/control-panel' && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader
                title="Control Panel"
                sub="Configure threat patterns · Compile DFA · Launch stress test"
                theme={theme}
                onToggleTheme={toggleTheme}
              />
              <div className="flex-1 overflow-auto px-8 py-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-3 glass-card rounded-2xl p-6" style={{ backgroundColor: 'var(--surface-1)' }}>
                    <ControlPanel
                      pattern={pattern}
                      onPatternChange={setPattern}
                      prefix={prefix}
                      onPrefixChange={setPrefix}
                      suffix={suffix}
                      onSuffixChange={setSuffix}
                      maxLength={maxLen}
                      onMaxLengthChange={setMaxLen}
                      compiling={compiling}
                      benchmarking={benchmarking}
                      onCompile={handleCompile}
                      onBenchmark={handleBenchmark}
                      error={error}
                    />
                  </div>

                  <div className="lg:col-span-2 flex flex-col gap-4">
                    {compiled ? (
                      <>
                        <div className="glass-card rounded-2xl p-5" style={{ backgroundColor: 'var(--surface-1)' }}>
                          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-md)' }}>
                            Active DFA Specifications
                          </h3>
                          <dl className="space-y-2.5">
                            {[
                              ['Pattern', compiled.pattern, 'var(--accent-cyan)'],
                              ['DFA States', String(compiled.state_count), 'var(--text-hi)'],
                              ['NFA States', String(compiled.nfa_state_count), 'var(--text-hi)'],
                              ['Alphabet Size', `${compiled.alphabet.length} symbols`, 'var(--text-hi)'],
                              ['Compile Time', `${compiled.compile_ms.toFixed(2)} ms`, 'var(--accent-green)'],
                              ['Start State', `q${compiled.start_state}`, 'var(--accent-cyan)'],
                              ['Trap State', compiled.trap_state !== null ? `q${compiled.trap_state}` : 'None', 'var(--accent-red)'],
                            ].map(([k, v, vc]) => (
                              <div key={k} className="flex justify-between gap-2 border-b pb-1.5 font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
                                <dt style={{ color: 'var(--text-md)' }}>{k}</dt>
                                <dd className="font-bold truncate max-w-[150px]" style={{ color: vc }}>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <ReDoSWarnings warnings={compiled.redos_warnings} />
                        <MatchTester pattern={compiled.pattern} onResult={handleMatchResult} />
                      </>
                    ) : (
                      <div
                        className="glass-card rounded-2xl flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[220px]"
                        style={{ backgroundColor: 'var(--surface-1)' }}
                      >
                        <span className="text-2xl mb-2">⚡</span>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-hi)' }}>Awaiting Pattern</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-lo)' }}>
                          Hit "Compile DFA" to generate deterministic transition matrices.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TRANSITION MATRIX & STATE DIAGRAM
              ══════════════════════════════════════════════════════ */}
          {displayView === '/matrix' && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader
                title="DFA State Diagram & Transition Matrix"
                sub={compiled ? `Pattern: ${compiled.pattern}  ·  ${compiled.state_count} States` : 'No DFA loaded'}
                theme={theme}
                onToggleTheme={toggleTheme}
              >
                {/* View Mode Switcher */}
                <div
                  className="flex items-center gap-1 rounded-xl p-1 border shadow-sm"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setMatrixMode('graph')}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: matrixMode === 'graph' ? 'var(--surface-1)' : 'transparent',
                      color: matrixMode === 'graph' ? 'var(--accent-primary)' : 'var(--text-md)',
                      boxShadow: matrixMode === 'graph' ? 'var(--card-shadow)' : 'none',
                    }}
                  >
                    ⚛️ State Diagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixMode('split')}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: matrixMode === 'split' ? 'var(--surface-1)' : 'transparent',
                      color: matrixMode === 'split' ? 'var(--accent-primary)' : 'var(--text-md)',
                      boxShadow: matrixMode === 'split' ? 'var(--card-shadow)' : 'none',
                    }}
                  >
                    📑 Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixMode('table')}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: matrixMode === 'table' ? 'var(--surface-1)' : 'transparent',
                      color: matrixMode === 'table' ? 'var(--accent-primary)' : 'var(--text-md)',
                      boxShadow: matrixMode === 'table' ? 'var(--card-shadow)' : 'none',
                    }}
                  >
                    🔢 Matrix Table
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!compiled}
                  onClick={() => {
                    if (!compiled) return
                    const blob = new Blob([JSON.stringify(compiled, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    Object.assign(document.createElement('a'), { href: url, download: 'dfa-table.json' }).click()
                    URL.revokeObjectURL(url)
                    push('info', 'Exported transition matrix as JSON')
                  }}
                  className="btn-primary px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40"
                >
                  ↑ Export JSON
                </button>
              </PageHeader>

              <div className="flex-1 overflow-auto px-8 py-6">
                {compiled ? (
                  <>
                    {/* Mode 1: Full-width Graph Diagram View */}
                    {matrixMode === 'graph' && (
                      <div className="flex flex-col gap-6">
                        <AutomatonInsight
                          states={compiled.states}
                          transitions={compiled.transitions}
                          startState={compiled.start_state}
                          acceptingStates={compiled.states.filter((s) => s.accepting).map((s) => s.id)}
                          trapState={compiled.trap_state}
                          height={380}
                          isExpanded={true}
                        />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <MatchTester pattern={compiled.pattern} onResult={handleMatchResult} />
                          <ReDoSWarnings warnings={compiled.redos_warnings} />
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Split View (Side-by-side Table & Diagram) */}
                    {matrixMode === 'split' && (
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 h-full">
                        <div className="xl:col-span-7 glass-card rounded-2xl p-5 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--surface-1)' }}>
                          <DfaTable compiled={compiled} />
                        </div>
                        <div className="xl:col-span-5 flex flex-col gap-4">
                          <AutomatonInsight
                            states={compiled.states}
                            transitions={compiled.transitions}
                            startState={compiled.start_state}
                            acceptingStates={compiled.states.filter((s) => s.accepting).map((s) => s.id)}
                            trapState={compiled.trap_state}
                            height={280}
                            isExpanded={false}
                          />
                          <ReDoSWarnings warnings={compiled.redos_warnings} />
                          <MatchTester pattern={compiled.pattern} onResult={handleMatchResult} />
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Full-width Transition Table View */}
                    {matrixMode === 'table' && (
                      <div className="glass-card rounded-2xl p-6 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--surface-1)' }}>
                        <DfaTable compiled={compiled} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <span className="text-3xl">🔢</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-hi)' }}>No Transition Matrix Compiled Yet</p>
                    <button
                      type="button"
                      onClick={() => navigate('/control-panel')}
                      className="btn-primary px-5 py-2 rounded-xl text-xs font-bold"
                    >
                      Go to Control Panel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              BENCHMARK CHART
              ══════════════════════════════════════════════════════ */}
          {displayView === '/benchmark' && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader
                title="Performance Benchmark (Linearity Proof)"
                sub={benchmark ? `Pattern: ${benchmark.pattern}  ·  ${benchmark.verdict}` : 'No stress test data available'}
                theme={theme}
                onToggleTheme={toggleTheme}
              >
                <button
                  type="button"
                  disabled={benchmarking || !pattern}
                  onClick={handleBenchmark}
                  className="btn-danger-warm px-3.5 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40"
                >
                  {benchmarking ? 'Running…' : '↺ Re-run Test'}
                </button>
              </PageHeader>

              <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
                {benchmark && benchmark.rows.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                      <KpiCard
                        label="DFA Total Time"
                        rawValue={Math.round(benchmark.totals.dfa_total_ms * 100)}
                        format={(n) => `${(n / 100).toFixed(2)} ms`}
                        sub={`${benchmark.totals.max_dfa_steps} Max Steps`}
                        accent="var(--accent-cyan)"
                        icon="⚡"
                      />
                      <KpiCard
                        label="Backtracker Total Time"
                        rawValue={Math.round(benchmark.totals.backtrack_total_ms * 100)}
                        format={(n) => `${(n / 100).toFixed(2)} ms`}
                        sub={`${benchmark.totals.max_backtrack_steps.toLocaleString()} Max Steps`}
                        accent="var(--accent-red)"
                        icon="💀"
                      />
                      <KpiCard
                        label="Payload Length (n)"
                        rawValue={benchmark.totals.max_payload_length}
                        sub="Maximum Tested"
                        accent="var(--accent-amber)"
                        icon="📏"
                      />
                      <KpiCard
                        label="Speedup Advantage"
                        rawValue={benchmark.totals.aggregate_speedup ?? null}
                        format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k×` : `${n.toFixed(0)}×`)}
                        sub="DFA vs Backtracker"
                        accent="var(--accent-green)"
                        icon="🚀"
                      />
                    </div>

                    <div className="glass-card rounded-2xl p-6" style={{ backgroundColor: 'var(--surface-1)' }}>
                      <div className="mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-md)' }}>
                          Figure 7.2: Side-by-Side Asymptotic Complexity Proof
                        </h3>
                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-lo)' }}>
                          Pattern: <span style={{ color: 'var(--accent-cyan)' }}>{benchmark.pattern}</span> — O(n) DFA vs O(2ⁿ) Backtracking (Log Scale)
                        </p>
                      </div>
                      <DualBenchmarkChart rows={benchmark.rows} />
                    </div>

                    <div className="glass-card rounded-2xl p-6" style={{ backgroundColor: 'var(--surface-1)' }}>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-md)' }}>
                        Interactive Complexity Chart & Data Table
                      </h3>
                      <div className="h-72">
                        <BenchmarkChart rows={benchmark.rows} running={benchmarking} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <span className="text-3xl">📈</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-hi)' }}>No Stress Test Results Yet</p>
                    <button
                      type="button"
                      onClick={() => navigate('/control-panel')}
                      className="btn-primary px-5 py-2 rounded-xl text-xs font-bold"
                    >
                      Run a Stress Test
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              SECURITY LOG
              ══════════════════════════════════════════════════════ */}
          {displayView === '/security-log' && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader
                title="Security Event Log"
                sub="Live streaming telemetry and engine actions"
                theme={theme}
                onToggleTheme={toggleTheme}
              >
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-md)' }}>
                  <span className="w-2 h-2 rounded-full animate-soft-pulse" style={{ backgroundColor: 'var(--accent-green)' }} />
                  {logs.length} logged events
                </div>
              </PageHeader>
              <div className="flex-1 overflow-hidden px-8 py-6">
                <div className="h-full glass-card rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--surface-1)' }}>
                  <SecurityLog entries={logs} onClear={() => setLogs([])} />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              WORKFLOW INFOGRAPHIC
              ══════════════════════════════════════════════════════ */}
          {displayView === '/workflow' && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader
                title="ReDoS Detection & Prevention Workflow"
                sub="End-to-end automata compilation pipeline"
                theme={theme}
                onToggleTheme={toggleTheme}
              >
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold"
                >
                  ← Back to Dashboard
                </button>
              </PageHeader>
              <div className="flex-1 overflow-hidden">
                <WorkflowView />
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

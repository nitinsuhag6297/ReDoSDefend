/**
 * WorkflowView — the ReDoS Detection & Prevention workflow infographic.
 *
 * Dual-Theme pipeline presentation:
 * Input → Detection → Prevention (Parser → Thompson → Powerset) → Guaranteed Performance → Match Executed.
 */

import type { ReactNode } from 'react'

interface PhaseCardProps {
  variant: 'input' | 'detect' | 'prevent' | 'perf' | 'goal'
  head: ReactNode
  children: ReactNode
}

function PhaseCard({ variant, head, children }: PhaseCardProps) {
  const tones: Record<PhaseCardProps['variant'], { border: string; bg: string; headColor: string }> = {
    input:   { border: 'var(--accent-cyan)',   bg: 'var(--accent-cyan-dim)',   headColor: 'var(--accent-cyan)' },
    detect:  { border: 'var(--accent-red)',    bg: 'var(--accent-red-dim)',    headColor: 'var(--accent-red)' },
    prevent: { border: 'var(--accent-primary)',bg: 'var(--accent-soft)',       headColor: 'var(--accent-primary)' },
    perf:    { border: 'var(--accent-green)',  bg: 'var(--accent-green-dim)',  headColor: 'var(--accent-green)' },
    goal:    { border: 'var(--accent-amber)',  bg: 'var(--accent-amber-dim)',  headColor: 'var(--accent-amber)' },
  }
  const tone = tones[variant]
  return (
    <div className="flex flex-col gap-2 shrink-0 w-[290px]">
      <div
        className="rounded-2xl p-4 relative shadow-sm theme-transition"
        style={{
          border: `1px solid ${tone.border}`,
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <div
          className="absolute -top-3 left-4 rounded-full px-2.5 py-0.5 shadow-sm"
          style={{
            backgroundColor: 'var(--surface-1)',
            border: `1px solid ${tone.border}`,
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tone.headColor }}>
            {head}
          </span>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="self-center shrink-0 w-4 h-4 mt-8 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--border-hi)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12 L11 6 L5 0" />
      </svg>
    </div>
  )
}

function ListItem({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-hi)' }}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

export default function WorkflowView() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden theme-transition" style={{ backgroundColor: 'var(--bg)' }}>
      <header
        className="flex flex-col items-center gap-1 px-6 py-6 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-hi)' }}>
          ReDoS Detection &amp; Prevention Workflow
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-md)' }}>
          Transforming vulnerable regular expressions into O(n) linear-time deterministic execution paths.
        </p>
      </header>

      <div className="flex-1 overflow-x-auto px-6 py-8">
        <div className="inline-flex h-full min-w-[1560px] items-start gap-6">
          <PhaseCard variant="input" head={<>Start: Input Pattern</>}>
            <ListItem icon="👤">User / Application Regex Input</ListItem>
            <p className="mt-2 text-xs font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
              e.g., ^(a+)+$
            </p>
          </PhaseCard>
          <Arrow />

          <PhaseCard variant="detect" head={<>Phase 1: Detection</>}>
            <div className="space-y-1.5">
              <ListItem icon="🔍">Checks for nested quantifiers</ListItem>
              <ListItem icon="🔍">Overlapping repeating groups</ListItem>
              <ListItem icon="🔍">Catastrophic backtracking paths</ListItem>
            </div>
            <p className="mt-3 text-[11px] font-semibold" style={{ color: 'var(--accent-red)' }}>
              Flags potential ReDoS risks early
            </p>
          </PhaseCard>
          <Arrow />

          <PhaseCard variant="prevent" head={<>Phase 2: Prevention</>}>
            <div className="space-y-1.5">
              <ListItem icon="🔹">Regex Parser → AST</ListItem>
              <ListItem icon="🔹">Thompson's Construction (ε-NFA)</ListItem>
              <ListItem icon="🔹">Powerset Construction (strict DFA)</ListItem>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-md)' }}>
              <span className="font-bold" style={{ color: 'var(--text-hi)' }}>Key highlight:</span> Compiles all ambiguous NFA branches into single deterministic states.
            </p>
          </PhaseCard>
          <Arrow />

          <PhaseCard variant="perf" head={<>Phase 3: Guaranteed Performance</>}>
            <ListItem icon="⚡">DFA Transition Table &amp; Matrix</ListItem>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-md)' }}>
              Every input character executes exactly one state lookup. Backtracking is mathematically eliminated.
            </p>
          </PhaseCard>
          <Arrow />

          <PhaseCard variant="goal" head={<>Goal: Safe Execution</>}>
            <ListItem icon="🛡️">Safe O(n) Linear-Time Matching</ListItem>
            <p className="mt-2 text-[11px] leading-relaxed font-semibold" style={{ color: 'var(--text-hi)' }}>
              Execution time scales directly with string length n. No exponential blowup O(2ⁿ). Completely immune to ReDoS.
            </p>
          </PhaseCard>
        </div>
      </div>

      <footer className="px-6 py-4 border-t text-xs font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-lo)' }}>
        Pattern Parsing → Thompson's ε-NFA → Powerset DFA → Linear-Time Execution
      </footer>
    </div>
  )
}

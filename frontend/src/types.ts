/** Shared types mirroring the FastAPI response schemas. */

export interface DFAState {
  id: number
  accepting: boolean
  start: boolean
  trap: boolean
  subset: number[]
}

export interface NFAState {
  id: number
  epsilon: number[]
  transitions: { label: string; negated: boolean; to: number[] }[]
}

export interface CompileResponse {
  pattern: string
  alphabet: string[]
  literals: string[]
  start_state: number
  trap_state: number | null
  states: DFAState[]
  transitions: Record<string, number>[]
  nfa: { start: number; accept: number; states: NFAState[] }
  ast: Record<string, unknown>
  redos_warnings: string[]
  state_count: number
  nfa_state_count: number
  compile_ms: number
}

export interface BenchmarkRow {
  length: number
  payload_preview: string
  dfa_ms: number
  dfa_steps: number
  dfa_matched: boolean | null
  backtrack_ms: number
  backtrack_steps: number
  backtrack_matched: boolean | null
  backtrack_aborted: boolean
  native_ms: number | null
  native_matched: boolean | null
  native_aborted: boolean
  speedup: number | null
}

export interface BenchmarkResponse {
  pattern: string
  rows: BenchmarkRow[]
  dfa_state_count: number
  totals: {
    dfa_total_ms: number
    backtrack_total_ms: number
    aggregate_speedup: number | null
    max_payload_length: number
    max_backtrack_steps: number
    max_dfa_steps: number
  }
  verdict: string
}

export interface MatchResponse {
  pattern: string
  text_preview: string
  allowed: boolean
  reason: string
  dfa_steps: number
  elapsed_ms: number
  dfa_state_count: number
}

export interface LogEntry {
  id: number
  timestamp: string
  level: 'info' | 'warn' | 'critical' | 'good'
  message: string
}

/**
 * Matrix inspector — the compiled DFA transition table.
 *
 * Clean, dual-theme grid showing States, Inputs, Subsets, and State Types.
 */

import { useMemo, useState } from 'react'
import type { CompileResponse } from '../types'

interface Props {
  compiled: CompileResponse | null
}

type Filter = 'all' | 'start' | 'accepting' | 'dead'

type DfaRow = {
  state: CompileResponse['states'][number]
  row: Record<string, number>
  isDead: boolean
}

function symbolLabel(symbol: string): string {
  if (symbol === '\x00OTHER') return 'INPUT: "any-other"'
  if (symbol === '\n') return 'INPUT: "\\n"'
  if (symbol === '\t') return 'INPUT: "\\t"'
  if (symbol === '\r') return 'INPUT: "\\r"'
  if (symbol === ' ') return 'INPUT: "␣"'
  return `INPUT: "${symbol}"`
}

export default function DfaTable({ compiled }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<number | null>(null)

  const rows = useMemo<DfaRow[]>(() => {
    if (!compiled) return []
    const allRows: DfaRow[] = compiled.states.map((state) => {
      const row = compiled.transitions[state.id] ?? {}
      const isDead = state.trap === true
      return { state, row, isDead }
    })
    switch (filter) {
      case 'start':
        return allRows.filter((r) => r.state.start)
      case 'accepting':
        return allRows.filter((r) => r.state.accepting)
      case 'dead':
        return allRows.filter((r) => r.isDead)
      default:
        return allRows
    }
  }, [compiled, filter])

  if (!compiled) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center font-mono text-xs" style={{ color: 'var(--text-lo)' }}>
        <span>
          <span style={{ color: 'var(--accent-green)' }}>$</span> Awaiting compile — no transition matrix loaded
        </span>
      </div>
    )
  }

  const { states, alphabet, start_state } = compiled
  const acceptingCount = states.filter((s) => s.accepting).length
  const deadCount = states.filter((s) => s.trap).length

  const filterButton = (key: Filter, label: string) => {
    const active = filter === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => setFilter(key)}
        className="rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-all"
        style={{
          backgroundColor: active ? 'var(--accent-primary)' : 'var(--surface-2)',
          color: active ? '#ffffff' : 'var(--text-md)',
          border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Table Subheader with State Count & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-hi)' }}>
            DFA Transition Matrix
          </h2>
          <p className="mt-0.5 font-mono text-xs" style={{ color: 'var(--text-md)' }}>
            {states.length} states · {alphabet.length} alphabet inputs · {acceptingCount} accepting · {deadCount} dead/trap
          </p>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Filter states">
          {filterButton('all', `All (${states.length})`)}
          {filterButton('start', 'Start')}
          {filterButton('accepting', 'Accepting')}
          {filterButton('dead', 'Dead')}
        </div>
      </div>

      {/* Responsive Matrix Grid */}
      <div
        className="min-h-0 flex-1 overflow-auto rounded-xl border shadow-sm"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <table className="w-full border-collapse font-mono text-xs">
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <th scope="col" className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-hi)' }}>
                STATE
              </th>
              {alphabet.map((symbol) => (
                <th
                  key={symbol}
                  scope="col"
                  className="px-4 py-3 text-left font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {symbolLabel(symbol)}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-hi)' }}>
                TYPE
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ state, row, isDead }) => {
              const isSelected = selected === state.id
              const rowBg = isSelected
                ? 'var(--surface-3)'
                : isDead
                  ? 'var(--accent-red-dim)'
                  : state.accepting
                    ? 'var(--accent-green-dim)'
                    : 'transparent'

              let typeLabel = 'Internal State'
              let typeColor = 'var(--text-md)'
              if (state.start) {
                typeLabel = 'Start State'
                typeColor = 'var(--accent-cyan)'
              } else if (state.accepting) {
                typeLabel = 'Accepting'
                typeColor = 'var(--accent-green)'
              } else if (isDead) {
                typeLabel = 'Dead / Trap State'
                typeColor = 'var(--accent-red)'
              }

              return (
                <tr
                  key={state.id}
                  onClick={() => setSelected(isSelected ? null : state.id)}
                  className="cursor-pointer border-b transition-colors"
                  style={{
                    backgroundColor: rowBg,
                    borderColor: 'var(--border)',
                  }}
                >
                  {/* State identifier + role badge + NFA subsets */}
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: 'var(--text-hi)' }}>
                        {state.id}
                      </span>

                      {state.start && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: 'var(--accent-cyan)', color: '#ffffff' }}
                        >
                          ▶ START
                        </span>
                      )}

                      {state.accepting && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: 'var(--accent-green)', color: '#ffffff' }}
                        >
                          ⊚ ACCEPT
                        </span>
                      )}

                      {isDead && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: 'var(--accent-red)', color: '#ffffff' }}
                        >
                          TRAP
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-lo)' }}>
                      Subsets: {state.subset.length ? `{${state.subset.join(', ')}}` : '∅'}
                    </div>
                  </td>

                  {/* Transition Target Cells */}
                  {alphabet.map((symbol) => {
                    const target = row[symbol]
                    return (
                      <td key={symbol} className="px-4 py-3">
                        {target === undefined ? (
                          <span style={{ color: 'var(--text-lo)' }}>—</span>
                        ) : (
                          <span
                            className="px-2.5 py-1 rounded font-bold underline transition-colors"
                            style={{
                              backgroundColor: 'var(--surface-2)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            State {target}
                          </span>
                        )}
                      </td>
                    )
                  })}

                  {/* Type Column */}
                  <td className="px-4 py-3 font-semibold" style={{ color: typeColor }}>
                    {typeLabel}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={alphabet.length + 2} className="px-4 py-8 text-center" style={{ color: 'var(--text-lo)' }}>
                  No states match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Explanatory Footnote */}
      <p className="font-mono text-xs" style={{ color: 'var(--text-lo)' }}>
        Start state is <strong style={{ color: 'var(--accent-cyan)' }}>q{start_state}</strong>. The
        <strong style={{ color: 'var(--accent-red)' }}> trap state</strong> represents the empty NFA subset: every unmatched input symbol transitions there and is rejected in O(1) time.
      </p>
    </div>
  )
}

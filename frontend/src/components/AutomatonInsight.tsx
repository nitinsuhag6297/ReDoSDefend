/**
 * Automaton Insight & DFA State Diagram Visualizer.
 *
 * Provides a clear, high-definition SVG state machine diagram.
 * Supports both compact panel and expanded full-canvas views with interactive state inspection.
 */

import { useMemo, useState } from 'react'
import type { DFAState } from '../types'

interface Props {
  states: DFAState[]
  transitions: Record<string, number>[]
  startState: number
  acceptingStates: number[]
  trapState: number | null
  height?: number
  isExpanded?: boolean
  onToggleExpand?: () => void
}

interface EdgeGroup {
  from: number
  to: number
  label: string
  isLoop: boolean
  isBiDirectional: boolean
}

function calculatePositions(count: number, width: number, height: number): { x: number; y: number }[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: width / 2, y: height / 2 }]

  if (count === 2) {
    return [
      { x: Math.round(width * 0.28), y: height / 2 },
      { x: Math.round(width * 0.72), y: height / 2 },
    ]
  }

  if (count === 3) {
    // Triangle layout (start top-left, accept top-right, trap bottom-center)
    return [
      { x: Math.round(width * 0.25), y: Math.round(height * 0.32) },
      { x: Math.round(width * 0.75), y: Math.round(height * 0.32) },
      { x: Math.round(width * 0.50), y: Math.round(height * 0.76) },
    ]
  }

  if (count === 4) {
    return [
      { x: Math.round(width * 0.22), y: Math.round(height * 0.5) },
      { x: Math.round(width * 0.5),  y: Math.round(height * 0.22) },
      { x: Math.round(width * 0.78), y: Math.round(height * 0.5) },
      { x: Math.round(width * 0.5),  y: Math.round(height * 0.78) },
    ]
  }

  // Circular / Elliptical layout for 5+ states
  const rx = (width - 120) / 2
  const ry = (height - 100) / 2
  const cx = width / 2
  const cy = height / 2

  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI + (i * 2 * Math.PI) / count
    return {
      x: Math.round(cx + Math.cos(angle) * rx),
      y: Math.round(cy + Math.sin(angle) * ry),
    }
  })
}

export default function AutomatonInsight({
  states,
  transitions,
  startState,
  acceptingStates,
  trapState,
  height = 260,
  isExpanded = false,
  onToggleExpand,
}: Props) {
  const [selectedState, setSelectedState] = useState<number | null>(null)
  const count = states.length

  const viewBoxW = isExpanded ? 640 : 440
  const viewBoxH = isExpanded ? 360 : height
  const nodeRadius = isExpanded ? 26 : 22

  const positions = useMemo(
    () => calculatePositions(count, viewBoxW, viewBoxH),
    [count, viewBoxW, viewBoxH]
  )

  // Group duplicate transitions between the same state pair into a single label
  const edges = useMemo<EdgeGroup[]>(() => {
    const map = new Map<string, { from: number; to: number; symbols: string[] }>()

    transitions.forEach((row, from) => {
      Object.entries(row).forEach(([symbol, to]) => {
        const key = `${from}->${to}`
        const label = symbol === '\x00OTHER' ? 'any-other' : symbol
        if (!map.has(key)) {
          map.set(key, { from, to, symbols: [label] })
        } else {
          const item = map.get(key)!
          if (!item.symbols.includes(label)) {
            item.symbols.push(label)
          }
        }
      })
    })

    return Array.from(map.values()).map(({ from, to, symbols }) => {
      const isLoop = from === to
      const hasReverse = !isLoop && map.has(`${to}->${from}`)
      let label = symbols.join(', ')
      if (symbols.length > 2) {
        label = `${symbols.slice(0, 2).join(', ')}+${symbols.length - 2}`
      }
      return {
        from,
        to,
        label,
        isLoop,
        isBiDirectional: hasReverse,
      }
    })
  }, [transitions])

  if (count === 0) {
    return (
      <div
        className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[220px]"
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        <span className="text-2xl mb-2">⚛️</span>
        <span className="font-semibold text-xs" style={{ color: 'var(--text-hi)' }}>
          No DFA states compiled yet
        </span>
        <span className="text-[11px] mt-1" style={{ color: 'var(--text-lo)' }}>
          Compile a regular expression to view the state transition graph.
        </span>
      </div>
    )
  }

  const activeStateObj = selectedState !== null ? states.find((s) => s.id === selectedState) : null
  const activeTransitions = selectedState !== null ? transitions[selectedState] ?? {} : null

  return (
    <div
      className="glass-card rounded-2xl p-5 theme-transition flex flex-col gap-3"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Card Header with State Count and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--text-hi)' }}>
            DFA State Diagram
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
          >
            {count} States
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-md)',
              }}
            >
              {isExpanded ? '⤢ Compact' : '⤢ Expand Diagram'}
            </button>
          )}

          <span
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: 'var(--accent-green-dim)',
              color: 'var(--accent-green)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-soft-pulse" style={{ backgroundColor: 'var(--accent-green)' }} />
            O(n) Active
          </span>
        </div>
      </div>

      {/* Main SVG State Graph Canvas */}
      <div
        className="relative w-full rounded-xl overflow-hidden border shadow-inner transition-all duration-300"
        style={{
          height: isExpanded ? 360 : height,
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
        }}
      >
        <svg
          viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full select-none"
        >
          <defs>
            {/* Standard transition arrowhead */}
            <marker
              id="edge-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,7 L7,3.5 z" fill="var(--border-hi)" />
            </marker>

            {/* Selected / Highlighted arrowhead */}
            <marker
              id="edge-arrow-highlight"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,7 L7,3.5 z" fill="var(--accent-primary)" />
            </marker>
          </defs>

          {/* ── Entry Arrow pointing into Start State ── */}
          {positions[startState] && (
            <g>
              <line
                x1={positions[startState].x - nodeRadius - 32}
                y1={positions[startState].y}
                x2={positions[startState].x - nodeRadius - 4}
                y2={positions[startState].y}
                stroke="var(--accent-cyan)"
                strokeWidth="2.5"
                markerEnd="url(#edge-arrow-highlight)"
              />
              <rect
                x={positions[startState].x - nodeRadius - 42}
                y={positions[startState].y - 20}
                width="38"
                height="14"
                rx="4"
                fill="var(--accent-cyan-dim)"
                stroke="var(--accent-cyan)"
                strokeWidth="0.8"
              />
              <text
                x={positions[startState].x - nodeRadius - 23}
                y={positions[startState].y - 10}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="800"
                fontFamily="ui-monospace, monospace"
                fill="var(--accent-cyan)"
              >
                START
              </text>
            </g>
          )}

          {/* ── Directed Transition Edges ── */}
          {edges.map((edge, idx) => {
            const pFrom = positions[edge.from]
            const pTo = positions[edge.to]
            if (!pFrom || !pTo) return null

            const isFocus =
              selectedState !== null && (selectedState === edge.from || selectedState === edge.to)

            const strokeColor = isFocus ? 'var(--accent-primary)' : 'var(--border-md)'
            const strokeWidth = isFocus ? 2.5 : 1.5
            const markerId = isFocus ? 'url(#edge-arrow-highlight)' : 'url(#edge-arrow)'

            if (edge.isLoop) {
              // Self-loop arc
              const isLower = pFrom.y > viewBoxH / 2
              const loopY = isLower ? pFrom.y + nodeRadius : pFrom.y - nodeRadius
              const sweep = isLower ? 1 : 0
              const pathD = `M ${pFrom.x - 10} ${loopY} A 18 18 0 1 ${sweep} ${pFrom.x + 10} ${loopY}`
              const labelY = isLower ? pFrom.y + nodeRadius + 26 : pFrom.y - nodeRadius - 12

              return (
                <g key={`loop-${idx}`} opacity={selectedState !== null && !isFocus ? 0.35 : 1}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    markerEnd={markerId}
                  />
                  <rect
                    x={pFrom.x - 24}
                    y={labelY - 8}
                    width="48"
                    height="14"
                    rx="4"
                    fill="var(--surface-1)"
                    stroke="var(--border-md)"
                    strokeWidth="1"
                  />
                  <text
                    x={pFrom.x}
                    y={labelY + 2.5}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="700"
                    fill={isFocus ? 'var(--accent-primary)' : 'var(--text-hi)'}
                  >
                    {edge.label}
                  </text>
                </g>
              )
            }

            // Normal Edge between 2 states
            const dx = pTo.x - pFrom.x
            const dy = pTo.y - pFrom.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / dist
            const uy = dy / dist

            const startX = pFrom.x + ux * nodeRadius
            const startY = pFrom.y + uy * nodeRadius
            const endX = pTo.x - ux * (nodeRadius + 5)
            const endY = pTo.y - uy * (nodeRadius + 5)

            let midX = (startX + endX) / 2
            let midY = (startY + endY) / 2
            let pathD: string

            if (edge.isBiDirectional) {
              const nx = -uy * 18
              const ny = ux * 18
              midX += nx
              midY += ny
              pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
            } else {
              pathD = `M ${startX} ${startY} L ${endX} ${endY}`
            }

            const pillW = Math.max(34, edge.label.length * 7 + 10)

            return (
              <g key={`edge-${idx}`} opacity={selectedState !== null && !isFocus ? 0.35 : 1}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={markerId}
                />
                <rect
                  x={midX - pillW / 2}
                  y={midY - 8}
                  width={pillW}
                  height="15"
                  rx="4"
                  fill="var(--surface-1)"
                  stroke="var(--border-md)"
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="700"
                  fill={isFocus ? 'var(--accent-primary)' : 'var(--text-hi)'}
                >
                  {edge.label}
                </text>
              </g>
            )
          })}

          {/* ── State Nodes (q0, q1, q2...) ── */}
          {states.map((state) => {
            const pos = positions[state.id]
            if (!pos) return null

            const isStart = state.id === startState
            const isAccept = acceptingStates.includes(state.id)
            const isDead = state.trap === true || state.id === trapState
            const isSelected = selectedState === state.id

            const nodeFill = isDead
              ? 'var(--accent-red-dim)'
              : isAccept
                ? 'var(--accent-green-dim)'
                : isStart
                  ? 'var(--accent-cyan-dim)'
                  : 'var(--surface-1)'

            const nodeStroke = isDead
              ? 'var(--accent-red)'
              : isAccept
                ? 'var(--accent-green)'
                : isStart
                  ? 'var(--accent-cyan)'
                  : 'var(--border-hi)'

            const roleTitle = isStart ? 'START' : isAccept ? 'ACCEPT' : isDead ? 'TRAP' : ''
            const subsetStr = state.subset.length ? `{${state.subset.join(',')}}` : '∅'

            return (
              <g
                key={`node-${state.id}`}
                className="cursor-pointer transition-transform"
                onClick={() => setSelectedState(isSelected ? null : state.id)}
              >
                {/* Concentric Double Ring for Accepting States */}
                {isAccept && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 5}
                    fill="none"
                    stroke={nodeStroke}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Primary Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={isSelected ? 3.5 : 2}
                  style={{
                    filter: isSelected ? 'drop-shadow(0 0 6px var(--accent-glow))' : 'none',
                  }}
                />

                {/* State Label: q0, q1, etc. */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={isExpanded ? '13' : '11.5'}
                  fontWeight="900"
                  fontFamily="ui-monospace, monospace"
                  fill={
                    isDead
                      ? 'var(--accent-red)'
                      : isAccept
                        ? 'var(--accent-green)'
                        : isStart
                          ? 'var(--accent-cyan)'
                          : 'var(--text-hi)'
                  }
                >
                  q{state.id}
                </text>

                {/* Status Badge below node */}
                {roleTitle && (
                  <text
                    x={pos.x}
                    y={pos.y + nodeRadius + 14}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="800"
                    fontFamily="ui-monospace, monospace"
                    fill={isDead ? 'var(--accent-red)' : isAccept ? 'var(--accent-green)' : 'var(--accent-cyan)'}
                  >
                    {roleTitle}
                  </text>
                )}

                {/* NFA Subset info label */}
                <text
                  x={pos.x}
                  y={pos.y + nodeRadius + (roleTitle ? 24 : 14)}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontFamily="ui-monospace, monospace"
                  fill="var(--text-lo)"
                >
                  {subsetStr}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* State Inspector / Details Pill */}
      {activeStateObj ? (
        <div
          className="rounded-xl p-3 border text-xs font-mono flex items-center justify-between gap-3 animate-fade-in"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded font-black text-sm"
              style={{
                backgroundColor: activeStateObj.trap
                  ? 'var(--accent-red-dim)'
                  : activeStateObj.accepting
                    ? 'var(--accent-green-dim)'
                    : 'var(--accent-cyan-dim)',
                color: activeStateObj.trap
                  ? 'var(--accent-red)'
                  : activeStateObj.accepting
                    ? 'var(--accent-green)'
                    : 'var(--accent-cyan)',
              }}
            >
              State q{activeStateObj.id}
            </span>
            <span style={{ color: 'var(--text-md)' }}>
              {activeStateObj.start ? '• Start State' : ''}
              {activeStateObj.accepting ? '• Accepting State' : ''}
              {activeStateObj.trap ? '• Dead/Trap State' : ''}
              {!activeStateObj.start && !activeStateObj.accepting && !activeStateObj.trap ? '• Internal State' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span style={{ color: 'var(--text-lo)' }}>
              NFA Subset:{' '}
              <strong style={{ color: 'var(--text-hi)' }}>
                {activeStateObj.subset.length ? `{${activeStateObj.subset.join(', ')}}` : '∅'}
              </strong>
            </span>

            {activeTransitions && Object.keys(activeTransitions).length > 0 && (
              <span className="hidden sm:inline" style={{ color: 'var(--text-lo)' }}>
                Next:{' '}
                {Object.entries(activeTransitions).map(([sym, target]) => (
                  <span key={sym} className="ml-1 px-1 py-0.2 rounded" style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-hi)' }}>
                    '{sym === '\x00OTHER' ? 'other' : sym}'→q{target}
                  </span>
                ))}
              </span>
            )}

            <button
              type="button"
              onClick={() => setSelectedState(null)}
              className="text-[10px] text-xs font-bold px-1.5 py-0.5 rounded hover:underline"
              style={{ color: 'var(--text-lo)' }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-lo)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-cyan)' }} />
              Start State
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
              Accepting (Double Ring)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-red)' }} />
              Dead / Trap State
            </span>
          </div>
          <span className="text-[11px] font-mono">Click any state to inspect details</span>
        </div>
      )}
    </div>
  )
}

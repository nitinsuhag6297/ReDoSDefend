/**
 * Sidebar — Premium navigation rail with Dual Theme support.
 *
 * Elegantly adapts between Light Mode (cream, ivory, beige, light brown)
 * and Dark Mode (charcoal, obsidian, bronze).
 */

import { useEffect, useState } from 'react'

/* ── SVG icon set ──────────────────────────────────────────────────── */
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Control: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 12 2v2a8 8 0 0 1 5.66 2.34l1.41-1.41z"/><path d="M4.93 4.93A10 10 0 0 0 2 12h2a8 8 0 0 1 2.34-5.66L4.93 4.93z"/><path d="M19.07 19.07A10 10 0 0 0 22 12h-2a8 8 0 0 1-2.34 5.66l1.41 1.41z"/><path d="M4.93 19.07A10 10 0 0 0 12 22v-2a8 8 0 0 1-5.66-2.34l-1.41 1.41z"/>
    </svg>
  ),
  Matrix: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  ),
  Benchmark: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Log: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  Workflow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Sun: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
}

const NAV = [
  { href: '/',               label: 'Dashboard',        Icon: Icons.Dashboard  },
  { href: '/control-panel',  label: 'Control Panel',    Icon: Icons.Control    },
  { href: '/matrix',         label: 'Transition Matrix',Icon: Icons.Matrix     },
  { href: '/benchmark',      label: 'Benchmark Chart',  Icon: Icons.Benchmark  },
  { href: '/security-log',   label: 'Security Log',     Icon: Icons.Log        },
  { href: '/workflow',       label: 'Workflow',          Icon: Icons.Workflow   },
]

interface Props {
  active: string
  onNavigate: (href: string) => void
  logCount?: number
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function Sidebar({ active, onNavigate, logCount = 0, theme, onToggleTheme }: Props) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col theme-transition"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        boxShadow: '4px 0 24px -4px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="relative flex-shrink-0 w-9 h-9">
          <svg className="absolute inset-0 animate-spin-slow" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="var(--border-md)" strokeWidth="1.2" strokeDasharray="4 3"/>
          </svg>
          <div
            className="absolute inset-1 rounded-full flex items-center justify-center shadow-sm"
            style={{
              background: 'var(--surface-1)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <Icons.Shield />
          </div>
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-hi)' }}>
            DFA Engine
          </div>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: 'var(--accent-primary)' }}>
            ReDoS‑Proof v1.0
          </div>
        </div>
      </div>

      {/* ── Navigation Links ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, Icon }) => {
          const isActive = active === href
          return (
            <button
              key={href}
              type="button"
              onClick={() => onNavigate(href)}
              className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-left"
              style={{
                backgroundColor: isActive ? 'var(--surface-1)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-md)',
                boxShadow: isActive ? 'var(--card-shadow)' : 'none',
                border: isActive ? '1px solid var(--border-md)' : '1px solid transparent',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
              )}

              <span
                className="transition-transform duration-200"
                style={{
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-md)',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <Icon />
              </span>
              <span className="text-[13px]">{label}</span>

              {href === '/security-log' && logCount > 0 && (
                <span
                  className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: 'var(--accent-red-dim)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--accent-red)',
                  }}
                >
                  {logCount > 99 ? '99+' : logCount}
                </span>
              )}

              {!isActive && (
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--surface-3)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Footer: Theme Switcher & Status ───────────────────────── */}
      <div
        className="px-4 py-4 space-y-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Light/Dark Mode Switcher Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm"
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-md)',
            color: 'var(--text-hi)',
          }}
        >
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--accent-primary)' }}>
              {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
            </span>
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase"
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--accent-primary)',
            }}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Live Status indicator */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{
            backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="w-2 h-2 rounded-full animate-soft-pulse flex-shrink-0" style={{ backgroundColor: 'var(--accent-green)' }} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold" style={{ color: 'var(--accent-green)' }}>
              System Secure
            </div>
            <div className="text-[9px] font-mono truncate" style={{ color: 'var(--text-lo)' }}>
              O(n) Hardened · No Backtracking
            </div>
          </div>
        </div>

        {/* Live clock */}
        <div className="font-mono text-[10px] text-center" style={{ color: 'var(--text-lo)', letterSpacing: '0.06em' }}>
          {time}
        </div>
      </div>
    </aside>
  )
}

/**
 * Control panel — the left column of the bento grid (4/12 span).
 *
 * Regex and payload inputs sit on soft slate-50 fields with hairline borders
 * and a gentle indigo focus ring. The launch button is a solid, calming
 * indigo with a soft shadow and a slight scale-down on press.
 */

interface Props {
  pattern: string
  onPatternChange: (value: string) => void
  prefix: string
  onPrefixChange: (value: string) => void
  suffix: string
  onSuffixChange: (value: string) => void
  maxLength: number
  onMaxLengthChange: (value: number) => void
  compiling: boolean
  benchmarking: boolean
  onCompile: () => void
  onBenchmark: () => void
  error: string | null
}

const PRESETS: { label: string; pattern: string; note: string }[] = [
  {
    label: 'Nested quantifier',
    pattern: '^(a+)+$',
    note: 'The textbook ReDoS pattern: exponential backtracking on "aaa...!"',
  },
  {
    label: 'Alternation under star',
    pattern: '^(a|aa)+$',
    note: 'Ambiguous alternation inside a repetition.',
  },
  {
    label: 'Email-ish',
    pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
    note: 'A realistic rule with no catastrophic ambiguity.',
  },
  {
    label: 'Bounded repeat',
    pattern: '^(a{1,10})+$',
    note: 'Bounded repetition still multiplies paths when nested.',
  },
]

/** Shared styling for the soft, bordered monospace inputs. */
const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm ' +
  'text-slate-700 placeholder:text-slate-300 outline-none transition-all duration-200 ' +
  'focus-soft hover:border-slate-300'

export default function ControlPanel({
  pattern,
  onPatternChange,
  prefix,
  onPrefixChange,
  suffix,
  onSuffixChange,
  maxLength,
  onMaxLengthChange,
  compiling,
  benchmarking,
  onCompile,
  onBenchmark,
  error,
}: Props) {
  const busy = compiling || benchmarking

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Pattern input ---------------- */}
      <div>
        <label
          htmlFor="pattern"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500"
        >
          Regex Pattern
        </label>
        <input
          id="pattern"
          type="text"
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="^(a+)+$"
          className={fieldClass}
        />
      </div>

      {/* ---------------- Presets ---------------- */}
      <div>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Threat Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const active = preset.pattern === pattern
            return (
              <button
                key={preset.pattern}
                type="button"
                title={preset.note}
                onClick={() => onPatternChange(preset.pattern)}
                className={
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ' +
                  (active
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700')
                }
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------------- Payload config ---------------- */}
      <div>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Attack Payload
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="prefix" className="mb-1 block text-[10px] text-slate-400">
              prefix
            </label>
            <input
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              spellCheck={false}
              className={fieldClass + ' px-2 py-1.5 text-center text-xs'}
            />
          </div>
          <div>
            <label htmlFor="suffix" className="mb-1 block text-[10px] text-slate-400">
              suffix
            </label>
            <input
              id="suffix"
              type="text"
              value={suffix}
              onChange={(e) => onSuffixChange(e.target.value)}
              spellCheck={false}
              className={fieldClass + ' px-2 py-1.5 text-center text-xs'}
            />
          </div>
          <div>
            <label htmlFor="maxlen" className="mb-1 block text-[10px] text-slate-400">
              max n
            </label>
            <input
              id="maxlen"
              type="number"
              min={8}
              max={4096}
              value={maxLength}
              onChange={(e) => onMaxLengthChange(Number(e.target.value) || 8)}
              className={fieldClass + ' px-2 py-1.5 text-center text-xs'}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Payloads are built as <span className="font-mono text-slate-500">prefix × n + suffix</span>.
          The suffix forces the match to fail, driving the vulnerable engine to
          explore every possible split.
        </p>
      </div>

      {/* ---------------- Launch buttons ---------------- */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCompile}
          disabled={busy || !pattern}
          className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-200 hover:bg-[#3f58a3] hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
        >
          {compiling ? 'Compiling…' : 'Compile DFA'}
        </button>
        <button
          type="button"
          onClick={onBenchmark}
          disabled={busy || !pattern}
          className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {benchmarking ? 'Running…' : 'Stress Test'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700"
        >
          <span className="mr-1.5 font-bold">[ALERT]</span>
          {error}
        </div>
      )}
    </div>
  )
}

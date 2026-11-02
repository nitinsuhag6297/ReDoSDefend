/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        plane: 'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: 'var(--border)',
        borderStrong: 'var(--border-md)',
        ink: {
          primary: 'var(--text-hi)',
          secondary: 'var(--text-md)',
          muted: 'var(--text-lo)',
        },
        // Chart series & automata colors
        series: {
          dfa: 'var(--accent-cyan)',
          vuln: 'var(--accent-red)',
          native: 'var(--accent-amber)',
        },
        state: {
          start: 'var(--accent-cyan)',
          accept: 'var(--accent-green)',
          dead: 'var(--accent-red)',
        },
        // Warm light brown / beige / cream / dark tones
        cream: {
          50: '#FAF8F5',
          100: '#F5EFEB',
          200: '#EFE7DE',
          300: '#E5DACB',
          400: '#D4C3AF',
          500: '#B08968',
          600: '#9C6644',
          700: '#7F5539',
          800: '#533C2D',
          900: '#2B2118',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          soft: 'var(--accent-soft)',
          dim: 'var(--accent-soft)',
        },
        tag: {
          info: 'var(--accent-cyan)',
          warn: 'var(--accent-amber)',
          alert: 'var(--accent-red)',
          secure: 'var(--accent-green)',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'dash-flow': {
          from: { strokeDashoffset: '300' },
          to: { strokeDashoffset: '0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.4s ease forwards',
        'dash-flow': 'dash-flow 3s linear infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
    },
  },
  plugins: [],
}

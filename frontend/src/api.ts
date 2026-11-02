/** Thin API client for the FastAPI backend. */

import type { BenchmarkResponse, CompileResponse, MatchResponse } from './types'

const BASE = '/api'

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(
      'Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:8000 (start-backend.bat).'
    )
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      if (typeof payload?.detail === 'string') {
        detail = payload.detail
      } else if (Array.isArray(payload?.detail)) {
        detail = payload.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
      }
    } catch {
      /* keep the generic status message */
    }
    throw new Error(detail)
  }

  return (await response.json()) as T
}

export const compileRegex = (pattern: string) =>
  request<CompileResponse>('/compile', { pattern })

export const runBenchmark = (payload: {
  pattern: string
  prefix: string
  suffix: string
  min_length: number
  max_length: number
  step_budget: number
  native_timeout_ms: number
  include_native: boolean
}) => request<BenchmarkResponse>('/benchmark', payload)

export const matchPayload = (pattern: string, text: string) =>
  request<MatchResponse>('/match', { pattern, text })

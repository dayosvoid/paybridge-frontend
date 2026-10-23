import { API_BASE_URL } from '../config'
import type { ErrorBody } from './types'

/** A failed API call. `status` is 0 when the server could not be reached at all. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type TokenProvider = () => string | null
type RefreshHandler = () => Promise<boolean>
let tokenProvider: TokenProvider = () => null
let refreshHandler: RefreshHandler | null = null
export function setTokenProvider(provider: TokenProvider): void { tokenProvider = provider }
export function setRefreshHandler(handler: RefreshHandler | null): void { refreshHandler = handler }

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  idempotencyKey?: string
  /** Set false for public routes (login, register, refresh). Default true. */
  auth?: boolean
  /** Prevent refresh/retry for a request, mainly for auth endpoints. */
  retryOnUnauthorized?: boolean
  signal?: AbortSignal
}
export function newIdempotencyKey(): string { return crypto.randomUUID() }

async function send<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (options.auth !== false) {
    const token = tokenProvider()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET', headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NetworkError', 'Cannot reach the server. Check your connection and try again.')
  }

  if (response.status === 401 && allowRefresh && options.auth !== false && options.retryOnUnauthorized !== false && refreshHandler) {
    const refreshed = await refreshHandler()
    if (refreshed) return send<T>(path, options, false)
  }
  if (response.status === 204) return undefined as T
  const raw = await response.text()
  let parsed: unknown
  if (raw) { try { parsed = JSON.parse(raw) } catch { parsed = undefined } }
  if (!response.ok) {
    const body = parsed as Partial<ErrorBody> | undefined
    throw new ApiError(response.status, body?.error ?? response.statusText ?? 'Error', body?.message ?? `Request failed with status ${response.status}`)
  }
  return parsed as T
}
export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true)
}

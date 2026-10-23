import { apiRequest, setRefreshHandler, setTokenProvider } from '../api/client'
import type { TokenResponse, UserView } from '../api/types'

type Listener = () => void
const listeners = new Set<Listener>()
let accessToken: string | null = null
let refreshToken: string | null = null
let currentUser: UserView | null = null
let refreshInFlight: Promise<boolean> | null = null
let restoreInFlight: Promise<boolean> | null = null
let initialized = false

const STORAGE_KEY = 'paybridge.refreshToken'
function emit() { listeners.forEach((listener) => listener()) }
function persistRefreshToken(token: string | null) {
  refreshToken = token
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* Storage can be disabled; the in-memory session still works. */ }
}
function clearSession() {
  accessToken = null
  currentUser = null
  persistRefreshToken(null)
  initialized = true
  emit()
}
function acceptTokens(result: TokenResponse) {
  accessToken = result.accessToken
  currentUser = result.user
  persistRefreshToken(result.refreshToken)
  initialized = true
  emit()
}

setTokenProvider(() => accessToken)

/** One shared refresh promise prevents two callers from submitting the same rotating token. */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  const token = refreshToken
  if (!token) return Promise.resolve(false)
  refreshInFlight = (async () => {
    try {
      const result = await apiRequest<TokenResponse>('/auth/refresh', {
        method: 'POST', body: { refreshToken: token }, auth: false, retryOnUnauthorized: false,
      })
      acceptTokens(result)
      return true
    } catch {
      clearSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}
setRefreshHandler(refreshSession)

export interface RegisterInput { email: string; password: string; fullName: string }
export async function register(input: RegisterInput): Promise<UserView> {
  return apiRequest<UserView>('/auth/register', { method: 'POST', body: input, auth: false, retryOnUnauthorized: false })
}
export async function login(email: string, password: string): Promise<UserView> {
  const result = await apiRequest<TokenResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false, retryOnUnauthorized: false })
  acceptTokens(result)
  return result.user
}
export async function logout(): Promise<void> {
  const token = refreshToken
  try {
    if (token) await apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken: token }, auth: false, retryOnUnauthorized: false })
  } finally { clearSession() }
}
export async function logoutAll(): Promise<void> {
  try { await apiRequest<void>('/auth/logout-all', { method: 'POST' , retryOnUnauthorized: false }) }
  finally { clearSession() }
}
export function getSession() { return { user: currentUser, authenticated: Boolean(accessToken && currentUser), initialized } }
export function subscribeSession(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener) } }

/** Safe to call from repeated React StrictMode effects: all callers share one restoration promise. */
export function restoreSession(): Promise<boolean> {
  if (initialized) return Promise.resolve(Boolean(accessToken && currentUser))
  if (restoreInFlight) return restoreInFlight
  restoreInFlight = (async () => {
    try { refreshToken = sessionStorage.getItem(STORAGE_KEY) } catch { refreshToken = null }
    if (!refreshToken) { initialized = true; emit(); return false }
    return refreshSession()
  })().finally(() => { restoreInFlight = null })
  return restoreInFlight
}

/** Test helper; not used by application code. */
export function resetSessionForTests() {
  accessToken = null; refreshToken = null; currentUser = null; refreshInFlight = null; restoreInFlight = null; initialized = false
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  emit()
}

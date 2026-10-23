import type { TokenResponse, UserView } from '../api/types'

/**
 * An in-memory stand-in for the PayBridge backend, so the UI can be built and tried without it.
 * It follows the same rules as the real API (status codes, error shape, token rotation), but its data
 * lives in memory and is gone on reload. Each slice adds the routes it needs.
 */

export interface MockRequest {
  method: string
  /** Path without the /api prefix, e.g. /auth/login */
  path: string
  query: URLSearchParams
  body: unknown
  headers: Headers
}

export interface MockResponse {
  status: number
  body?: unknown
}

export interface MockApiOptions {
  /** Injectable clock (milliseconds) so tests can make tokens expire. */
  now?: () => number
  accessTtlSeconds?: number
  refreshTtlSeconds?: number
}

interface MockUser {
  id: number
  email: string
  password: string
  fullName: string
  accountNumber: string
}

interface MockRefreshToken {
  userId: number
  family: string
  used: boolean
  revoked: boolean
  expiresAt: number
}

const error = (status: number, code: string, message: string): MockResponse => ({
  status,
  body: { error: code, message },
})

const unauthorized = (message = 'Authentication is required: send a valid Bearer access token') =>
  error(401, 'Unauthorized', message)

function record(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function createMockApi(options: MockApiOptions = {}): (req: MockRequest) => MockResponse {
  const now = options.now ?? (() => Date.now())
  const accessTtl = options.accessTtlSeconds ?? 900
  const refreshTtl = options.refreshTtlSeconds ?? 604800

  const users = new Map<string, MockUser>() // by lower-case email
  const accessTokens = new Map<string, { userId: number; expiresAt: number }>()
  const refreshTokens = new Map<string, MockRefreshToken>()
  let nextUserId = 1000
  let counter = 0

  const token = (prefix: string) => `${prefix}-${++counter}-${Math.random().toString(36).slice(2, 12)}`

  const view = (u: MockUser): UserView => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: 'CUSTOMER',
    accountNumber: u.accountNumber,
  })

  function newAccountNumber(): string {
    const taken = new Set([...users.values()].map((u) => u.accountNumber))
    for (;;) {
      const n = String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999))
      if (!taken.has(n)) return n
    }
  }

  function issue(user: MockUser, family: string): TokenResponse {
    const access = token('mock-access')
    const refresh = token('mock-refresh')
    accessTokens.set(access, { userId: user.id, expiresAt: now() + accessTtl * 1000 })
    refreshTokens.set(refresh, {
      userId: user.id,
      family,
      used: false,
      revoked: false,
      expiresAt: now() + refreshTtl * 1000,
    })
    return {
      accessToken: access,
      tokenType: 'Bearer',
      expiresInSeconds: accessTtl,
      refreshToken: refresh,
      refreshExpiresInSeconds: refreshTtl,
      user: view(user),
    }
  }

  function authenticated(req: MockRequest): MockUser | null {
    const header = req.headers.get('Authorization') ?? ''
    if (!header.startsWith('Bearer ')) return null
    const entry = accessTokens.get(header.slice(7))
    if (!entry || entry.expiresAt <= now()) return null
    return [...users.values()].find((u) => u.id === entry.userId) ?? null
  }

  function revokeFamily(family: string) {
    for (const t of refreshTokens.values()) if (t.family === family) t.revoked = true
  }

  return (req) => {
    const route = `${req.method} ${req.path}`
    const body = record(req.body)

    switch (route) {
      case 'POST /auth/register': {
        const email = text(body.email).trim().toLowerCase()
        const password = text(body.password)
        const fullName = text(body.fullName).trim()
        if (!/^\S+@\S+\.\S+$/.test(email)) return error(400, 'Bad Request', 'email must be a well-formed email address')
        if (password.length < 8 || password.length > 72) return error(400, 'Bad Request', 'password size must be between 8 and 72')
        if (!fullName) return error(400, 'Bad Request', 'fullName must not be blank')
        if (users.has(email)) return error(409, 'Conflict', 'Email is already registered')
        const user: MockUser = { id: nextUserId++, email, password, fullName, accountNumber: newAccountNumber() }
        users.set(email, user)
        return { status: 201, body: view(user) }
      }

      case 'POST /auth/login': {
        const user = users.get(text(body.email).trim().toLowerCase())
        if (!user || user.password !== text(body.password)) {
          return error(401, 'Unauthorized', 'Invalid email or password')
        }
        return { status: 200, body: issue(user, token('family')) }
      }

      case 'POST /auth/refresh': {
        const entry = refreshTokens.get(text(body.refreshToken))
        const invalid = error(401, 'Unauthorized', 'Invalid or expired refresh token')
        if (!entry || entry.revoked || entry.expiresAt <= now()) return invalid
        if (entry.used) {
          revokeFamily(entry.family) // an old token again: someone else has it, end the whole login
          return invalid
        }
        const user = [...users.values()].find((u) => u.id === entry.userId)
        if (!user) return invalid
        entry.used = true
        return { status: 200, body: issue(user, entry.family) }
      }

      case 'POST /auth/logout': {
        const entry = refreshTokens.get(text(body.refreshToken))
        if (entry) revokeFamily(entry.family)
        return { status: 204 }
      }

      case 'POST /auth/logout-all': {
        const user = authenticated(req)
        if (!user) return unauthorized()
        for (const t of refreshTokens.values()) if (t.userId === user.id) t.revoked = true
        return { status: 204 }
      }

      case 'GET /auth/me': {
        const user = authenticated(req)
        return user ? { status: 200, body: view(user) } : unauthorized()
      }

      default:
        return error(404, 'Not Found', `The mock API has no route for ${route}`)
    }
  }
}

/** Wraps a handler as a fetch function. Calls outside `basePath` go to the real fetch. */
export function createMockFetch(
  basePath: string,
  handler: (req: MockRequest) => MockResponse,
  passthrough: typeof fetch,
  latencyMs = 0,
): typeof fetch {
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, 'http://mock.local')
    if (!url.pathname.startsWith(`${basePath}/`)) {
      return passthrough(input, init)
    }

    let body: unknown = undefined
    if (typeof init?.body === 'string' && init.body) {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = undefined
      }
    }
    const response = handler({
      method: (init?.method ?? 'GET').toUpperCase(),
      path: url.pathname.slice(basePath.length),
      query: url.searchParams,
      body,
      headers: new Headers(init?.headers),
    })

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
    }
    return new Response(response.status === 204 ? null : JSON.stringify(response.body ?? null), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/** Replaces window.fetch so every call to `basePath` is answered by the mock. Call once at startup. */
export function installMockApi(basePath: string): void {
  const original = window.fetch.bind(window)
  window.fetch = createMockFetch(basePath, createMockApi(), original, 150)
  console.info(`[PayBridge] Using the mock API for ${basePath}/* (set VITE_USE_MOCK=false for the real backend)`)
}

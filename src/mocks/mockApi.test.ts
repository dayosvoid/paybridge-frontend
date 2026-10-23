import { describe, expect, it } from 'vitest'
import { createMockApi, createMockFetch, type MockRequest } from './mockApi'

function call(api: ReturnType<typeof createMockApi>, method: string, path: string, body?: unknown, token?: string) {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const req: MockRequest = { method, path, query: new URLSearchParams(), body, headers }
  return api(req)
}

const credentials = { email: 'Ada@Example.com', password: 'correct-horse-battery', fullName: 'Ada Obi' }

function registered(api = createMockApi()) {
  call(api, 'POST', '/auth/register', credentials)
  return api
}

describe('mock auth', () => {
  it('registers a customer with an account number and refuses a duplicate email in any case', () => {
    const api = createMockApi()
    const first = call(api, 'POST', '/auth/register', credentials)
    expect(first.status).toBe(201)
    expect((first.body as { accountNumber: string }).accountNumber).toMatch(/^\d{10}$/)
    expect(call(api, 'POST', '/auth/register', { ...credentials, email: 'ada@example.com' }).status).toBe(409)
  })

  it('validates registration input', () => {
    const api = createMockApi()
    expect(call(api, 'POST', '/auth/register', { ...credentials, email: 'nope' }).status).toBe(400)
    expect(call(api, 'POST', '/auth/register', { ...credentials, password: 'short' }).status).toBe(400)
    expect(call(api, 'POST', '/auth/register', { ...credentials, fullName: ' ' }).status).toBe(400)
  })

  it('logs in, and a wrong password or unknown email gets the same 401', () => {
    const api = registered()
    const ok = call(api, 'POST', '/auth/login', { email: 'ada@example.com', password: credentials.password })
    expect(ok.status).toBe(200)
    const bad = call(api, 'POST', '/auth/login', { email: 'ada@example.com', password: 'wrong-password' })
    const unknown = call(api, 'POST', '/auth/login', { email: 'x@example.com', password: credentials.password })
    expect(bad.status).toBe(401)
    expect(unknown.body).toEqual(bad.body)
  })

  it('answers /auth/me only with a valid, unexpired access token', () => {
    let clock = 1_000_000
    const api = createMockApi({ now: () => clock, accessTtlSeconds: 900 })
    registered(api)
    const login = call(api, 'POST', '/auth/login', { email: 'ada@example.com', password: credentials.password })
    const access = (login.body as { accessToken: string }).accessToken

    expect(call(api, 'GET', '/auth/me').status).toBe(401)
    expect(call(api, 'GET', '/auth/me', undefined, 'garbage').status).toBe(401)
    expect(call(api, 'GET', '/auth/me', undefined, access).status).toBe(200)
    clock += 901_000
    expect(call(api, 'GET', '/auth/me', undefined, access).status).toBe(401)
  })

  it('rotates refresh tokens and ends the login if an old one is reused', () => {
    const api = registered()
    const login = call(api, 'POST', '/auth/login', { email: 'ada@example.com', password: credentials.password })
    const first = (login.body as { refreshToken: string }).refreshToken

    const second = call(api, 'POST', '/auth/refresh', { refreshToken: first })
    expect(second.status).toBe(200)
    const newest = (second.body as { refreshToken: string }).refreshToken
    expect(newest).not.toBe(first)

    expect(call(api, 'POST', '/auth/refresh', { refreshToken: first }).status).toBe(401) // replay
    expect(call(api, 'POST', '/auth/refresh', { refreshToken: newest }).status).toBe(401) // login revoked
  })

  it('logs out one login and leaves the user other logins alone', () => {
    const api = registered()
    const loginBody = { email: 'ada@example.com', password: credentials.password }
    const phone = (call(api, 'POST', '/auth/login', loginBody).body as { refreshToken: string }).refreshToken
    const laptop = (call(api, 'POST', '/auth/login', loginBody).body as { refreshToken: string }).refreshToken

    expect(call(api, 'POST', '/auth/logout', { refreshToken: phone }).status).toBe(204)
    expect(call(api, 'POST', '/auth/refresh', { refreshToken: phone }).status).toBe(401)
    expect(call(api, 'POST', '/auth/refresh', { refreshToken: laptop }).status).toBe(200)
  })

  it('has no route for anything else yet', () => {
    expect(call(createMockApi(), 'GET', '/accounts/1').status).toBe(404)
  })
})

describe('createMockFetch', () => {
  it('answers calls under the base path and lets others through', async () => {
    const passthrough = (async () => new Response('real', { status: 200 })) as typeof fetch
    const mockFetch = createMockFetch('/api', createMockApi(), passthrough)

    const mocked = await mockFetch('/api/auth/me')
    expect(mocked.status).toBe(401)
    expect(await mocked.json()).toMatchObject({ error: 'Unauthorized' })

    const other = await mockFetch('/somewhere-else')
    expect(await other.text()).toBe('real')
  })

  it('returns no body for a 204', async () => {
    const mockFetch = createMockFetch('/api', createMockApi(), fetch)
    const response = await mockFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'whatever' }),
    })
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })
})

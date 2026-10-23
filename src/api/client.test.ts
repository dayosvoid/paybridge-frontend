import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, newIdempotencyKey, setTokenProvider } from './client'

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(response: Response | Error | (() => Response | Error)) {
  const fn = vi.fn(async () => {
    const next = typeof response === 'function' ? response() : response
    if (next instanceof Error) throw next
    return next
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(() => null)
})

describe('apiRequest', () => {
  it('returns the parsed JSON body', async () => {
    const fetchMock = stubFetch(respond(200, { hello: 'world' }))

    const result = await apiRequest<{ hello: string }>('/things')

    expect(result).toEqual({ hello: 'world' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/things')
    expect(init.method).toBe('GET')
  })

  it('sends a JSON body and an Idempotency-Key', async () => {
    const fetchMock = stubFetch(respond(201, { ok: true }))

    await apiRequest('/transfers', { method: 'POST', body: { amountMinor: 100 }, idempotencyKey: 'key-1' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(init.body).toBe('{"amountMinor":100}')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Idempotency-Key']).toBe('key-1')
  })

  it('adds the Bearer token unless the call is public', async () => {
    setTokenProvider(() => 'abc123')
    const fetchMock = stubFetch(() => respond(200, {}))

    await apiRequest('/auth/me')
    await apiRequest('/auth/login', { method: 'POST', body: {}, auth: false })

    const first = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>
    const second = (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>
    expect(first['Authorization']).toBe('Bearer abc123')
    expect(second['Authorization']).toBeUndefined()
  })

  it('returns undefined for a 204', async () => {
    stubFetch(respond(204))
    expect(await apiRequest('/auth/logout', { method: 'POST', body: {} })).toBeUndefined()
  })

  it('turns an error body into an ApiError', async () => {
    stubFetch(respond(409, { error: 'Conflict', message: 'Email is already registered' }))

    const failure = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch((e) => e)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 409, code: 'Conflict', message: 'Email is already registered' })
  })

  it('still gives a useful ApiError when the error has no JSON body', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: 502 }))

    const failure: unknown = await apiRequest('/things').catch((e: unknown) => e)

    expect(failure).toBeInstanceOf(ApiError)
    if (!(failure instanceof ApiError)) throw failure
    expect(failure.status).toBe(502)
    expect(failure.message).toContain('502')
  })

  it('reports an unreachable server as status 0', async () => {
    stubFetch(new TypeError('Failed to fetch'))

    const failure = await apiRequest('/things').catch((e) => e)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 0, code: 'NetworkError' })
  })
})

describe('newIdempotencyKey', () => {
  it('is different every time', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })
})

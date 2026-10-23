import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFxQuote, executeFxConversion, getFxConversion, type FxQuote } from './fx'

const quote: FxQuote = { accountNumber: '1111111111', quoteId: 'quote/id', sourceCurrency: 'NGN', destinationCurrency: 'USD',
  sourceAmountMinor: 100, destinationAmountMinor: 1, rate: '0.0007', rateType: 'DEMO_CONFIGURED', expiresAt: '2026-10-23T10:02:00Z' }
const conversion = { ...quote, reference: 'FX/ref 1', status: 'SUCCESS', failureReason: null, createdAt: '2026-10-23T10:00:00Z' }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('FX API contract', () => {
  it('creates stored quotes with the supplied request, rather than using read-only /fx/quote', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(quote), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const request = { accountNumber: quote.accountNumber, sourceCurrency: quote.sourceCurrency, destinationCurrency: quote.destinationCurrency, sourceAmountMinor: quote.sourceAmountMinor }
    expect(await createFxQuote(request)).toEqual(quote)
    expect(fetchMock).toHaveBeenCalledWith('/api/fx/conversions/quotes', expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }))
  })
  it('sends only the quoteId and caller-provided Idempotency-Key for execution', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(conversion), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await executeFxConversion(quote.quoteId, 'fixed-key')).toEqual(conversion)
    expect(fetchMock).toHaveBeenCalledWith('/api/fx/conversions', expect.objectContaining({ method: 'POST', body: JSON.stringify({ quoteId: quote.quoteId }), headers: expect.objectContaining({ 'Idempotency-Key': 'fixed-key' }) }))
  })
  it('encodes conversion references for retrieval', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(conversion)))
    vi.stubGlobal('fetch', fetchMock)
    await getFxConversion(conversion.reference)
    expect(fetchMock).toHaveBeenCalledWith('/api/fx/conversions/FX%2Fref%201', expect.objectContaining({ method: 'GET' }))
  })
  it('rejects malformed stored quotes and unconfirmed conversion responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ rate: 1234 }))))
    await expect(createFxQuote(quote)).rejects.toThrow('invalid conversion quote')
    await expect(executeFxConversion(quote.quoteId, 'fixed-key')).rejects.toThrow('could not confirm')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyRemittances, getRemittance, getRemittanceQuotes, sendRemittance, type ProviderQuoteView } from './remittances'
import { setRefreshHandler, setTokenProvider } from './client'

const offer: ProviderQuoteView = { quoteId: 'QUOTE', providerId: 'demo', providerName: 'Demo provider', sourceAccount: '1111111111', sourceAmountMinor: 1000000,
  feeMinor: 1000, totalDebitMinor: 1001000, destinationCurrency: 'USD', destinationAmountMinor: 666, rate: 0.000666, etaMinutes: 10, tags: ['FASTEST'], expiresAt: '2026-10-23T10:02:00Z' }
const record = { reference: 'out/ref 1', status: 'PENDING', quoteId: offer.quoteId, providerId: offer.providerId, providerReference: null, sourceAccount: offer.sourceAccount,
  sourceAmountMinor: offer.sourceAmountMinor, feeMinor: offer.feeMinor, destinationCurrency: 'USD', destinationAmountMinor: offer.destinationAmountMinor, rate: offer.rate,
  beneficiaryName: 'Recipient', beneficiaryAccount: '1234567890', beneficiaryBank: 'Bank', failureReason: null, createdAt: '2026-10-23T10:00:03Z' }
function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
beforeEach(() => { setTokenProvider(() => 'customer-token'); setRefreshHandler(null) })
afterEach(() => { setTokenProvider(() => null); vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('customer remittance API contracts', () => {
  it('requests provider offers with authenticated NGN source and USD destination', async () => {
    const fetchMock = respond([offer], 201)
    const request = { sourceAccount: '1111111111', sourceAmountMinor: 1000000, destinationCurrency: 'USD' as const }
    expect(await getRemittanceQuotes(request)).toEqual([offer])
    expect(fetchMock).toHaveBeenCalledWith('/api/outbound-remittances/quotes', expect.objectContaining({ method: 'POST', body: JSON.stringify(request), headers: expect.objectContaining({ Authorization: 'Bearer customer-token' }) }))
  })
  it('uses only /mine pagination and authentication for customer history', async () => {
    const data = { items: [record], page: 2, size: 20, totalItems: 41, totalPages: 3, hasNext: false }
    const fetchMock = respond(data)
    expect(await getMyRemittances(2, 20)).toEqual(data)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/outbound-remittances/mine?page=2&size=20', expect.objectContaining({ method: 'GET', body: undefined, headers: expect.objectContaining({ Authorization: 'Bearer customer-token' }) }))
  })
  it('submits the exact payout body and supplied idempotency key', async () => {
    const fetchMock = respond(record, 201)
    const request = { quoteId: 'QUOTE', beneficiaryName: 'Recipient', beneficiaryAccount: '1234567890', beneficiaryBank: 'Bank' }
    expect(await sendRemittance(request, 'original-key')).toEqual(record)
    expect(fetchMock).toHaveBeenCalledWith('/api/outbound-remittances', expect.objectContaining({ method: 'POST', body: JSON.stringify(request), headers: expect.objectContaining({ 'Idempotency-Key': 'original-key', Authorization: 'Bearer customer-token' }) }))
  })
  it('retrieves encoded references with GET rather than calling reconciliation', async () => {
    const fetchMock = respond(record)
    await getRemittance(record.reference)
    expect(fetchMock).toHaveBeenCalledWith('/api/outbound-remittances/out%2Fref%201', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it.each([401, 403, 404])('propagates history HTTP %s without using an admin endpoint', async status => {
    const fetchMock = respond({ message: 'Customer access unavailable' }, status)
    await expect(getMyRemittances()).rejects.toMatchObject({ status, message: 'Customer access unavailable' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it.each([[-1, 20], [0, 0], [0, 101]])('rejects invalid history page %s / size %s locally', async (page, size) => {
    const fetchMock = respond({})
    await expect(getMyRemittances(page, size)).rejects.toThrow('pagination')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects malformed responses instead of inventing quote, payout or history fields', async () => {
    respond({ wrong: 'shape' })
    await expect(getMyRemittances()).rejects.toThrow('invalid customer remittance history')
    await expect(getRemittanceQuotes({ sourceAccount: '1111111111', sourceAmountMinor: 100, destinationCurrency: 'USD' })).rejects.toThrow('invalid provider quotes')
    await expect(sendRemittance({ quoteId: 'q', beneficiaryName: 'Name', beneficiaryAccount: 'Account', beneficiaryBank: 'Bank' }, 'key')).rejects.toThrow('could not confirm')
  })
})

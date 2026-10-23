import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RemittanceAttempt } from './remittanceAttempts'

const attempt: RemittanceAttempt = { key: 'original-key', quote: { quoteId: 'QUOTE', providerId: 'demo', providerName: 'Demo provider', sourceAccount: '1111111111',
  sourceAmountMinor: 1000000, feeMinor: 1000, totalDebitMinor: 1001000, destinationCurrency: 'USD', destinationAmountMinor: 666,
  rate: 0.000666, etaMinutes: 10, tags: [], expiresAt: '2026-10-23T10:02:00Z' },
  request: { quoteId: 'QUOTE', beneficiaryName: 'Recipient', beneficiaryAccount: '1234567890', beneficiaryBank: 'Bank' } }
beforeEach(() => { sessionStorage.clear(); vi.resetModules() })
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })
describe('remittance retry persistence', () => {
  it('retains the original request and key across module reloads and isolates accounts', async () => {
    const initial = await import('./remittanceAttempts')
    initial.saveRemittanceAttempt(attempt)
    vi.resetModules()
    const restored = await import('./remittanceAttempts')
    expect(restored.readRemittanceAttempt('1111111111')).toEqual(attempt)
    expect(restored.readRemittanceAttempt('2222222222')).toBeNull()
    restored.clearRemittanceAttempt('1111111111')
    expect(restored.readRemittanceAttempt('1111111111')).toBeNull()
  })
  it('rejects malformed state and a request associated with another quote or account', async () => {
    const api = await import('./remittanceAttempts')
    sessionStorage.setItem('paybridge.remittanceAttempt.2222222222', JSON.stringify(attempt))
    expect(api.readRemittanceAttempt('2222222222')).toBeNull()
    sessionStorage.setItem('paybridge.remittanceAttempt.1111111111', JSON.stringify({ ...attempt, request: { ...attempt.request, quoteId: 'OTHER' } }))
    expect(api.readRemittanceAttempt('1111111111')).toBeNull()
    sessionStorage.setItem('paybridge.remittanceAttempt.1111111111', '{broken')
    expect(api.readRemittanceAttempt('1111111111')).toBeNull()
  })
  it('retains retry protection in memory if browser storage is disabled', async () => {
    const api = await import('./remittanceAttempts')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Disabled') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Disabled') })
    api.saveRemittanceAttempt(attempt)
    expect(api.readRemittanceAttempt('1111111111')).toEqual(attempt)
    api.clearRemittanceAttempt('1111111111')
    expect(api.readRemittanceAttempt('1111111111')).toBeNull()
  })
})

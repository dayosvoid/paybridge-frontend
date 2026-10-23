import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FxAttempt } from './fxAttempts'

const attempt: FxAttempt = { key: 'original-key', quote: { quoteId: 'stored-quote', accountNumber: '1111111111',
  sourceCurrency: 'NGN', destinationCurrency: 'USD', sourceAmountMinor: 100, destinationAmountMinor: 1,
  rate: '0.0007', rateType: 'DEMO_CONFIGURED', expiresAt: '2026-10-23T10:02:00Z' } }
beforeEach(() => { sessionStorage.clear(); vi.resetModules() })
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })
describe('FX attempt persistence', () => {
  it('restores the original quote and key through a module reload and isolates accounts', async () => {
    const initial = await import('./fxAttempts')
    initial.saveFxAttempt(attempt)
    vi.resetModules()
    const restored = await import('./fxAttempts')
    expect(restored.readFxAttempt('1111111111')).toEqual(attempt)
    expect(restored.readFxAttempt('2222222222')).toBeNull()
    restored.clearFxAttempt('1111111111')
    expect(restored.readFxAttempt('1111111111')).toBeNull()
  })
  it('ignores malformed or wrong-account stored attempts', async () => {
    const api = await import('./fxAttempts')
    sessionStorage.setItem('paybridge.fxAttempt.2222222222', JSON.stringify(attempt))
    expect(api.readFxAttempt('2222222222')).toBeNull()
    sessionStorage.setItem('paybridge.fxAttempt.1111111111', '{broken')
    expect(api.readFxAttempt('1111111111')).toBeNull()
  })
  it('retains the original key in memory if browser storage is disabled', async () => {
    const api = await import('./fxAttempts')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Disabled') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Disabled') })
    api.saveFxAttempt(attempt)
    expect(api.readFxAttempt('1111111111')).toEqual(attempt)
    api.clearFxAttempt('1111111111')
    expect(api.readFxAttempt('1111111111')).toBeNull()
  })
})

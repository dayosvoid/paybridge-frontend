import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredTransferAttempt } from './transferAttempts'

const attempt: StoredTransferAttempt = {
  key: 'stable-key', request: { sourceAccount: '1111111111', destinationAccount: '2222222222', currency: 'NGN', amountMinor: 1234, bankCode: null },
}
beforeEach(() => { sessionStorage.clear(); vi.resetModules() })
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })

describe('unresolved transfer attempt storage', () => {
  it('restores the same request and key after module reload and scopes it to the source account', async () => {
    const first = await import('./transferAttempts')
    first.saveTransferAttempt(attempt)
    vi.resetModules()
    const restored = await import('./transferAttempts')
    expect(restored.readTransferAttempt('1111111111')).toEqual(attempt)
    expect(restored.readTransferAttempt('2222222222')).toBeNull()
    restored.clearTransferAttempt('1111111111')
    expect(restored.readTransferAttempt('1111111111')).toBeNull()
    expect(sessionStorage.getItem('paybridge.transferAttempt.1111111111')).toBeNull()
  })

  it('rejects stored requests for another account and malformed storage', async () => {
    const api = await import('./transferAttempts')
    sessionStorage.setItem('paybridge.transferAttempt.2222222222', JSON.stringify(attempt))
    expect(api.readTransferAttempt('2222222222')).toBeNull()
    sessionStorage.setItem('paybridge.transferAttempt.1111111111', '{broken')
    expect(api.readTransferAttempt('1111111111')).toBeNull()
  })

  it('keeps retries safe in memory when browser storage is disabled', async () => {
    const api = await import('./transferAttempts')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Disabled') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Disabled') })
    api.saveTransferAttempt(attempt)
    expect(api.readTransferAttempt('1111111111')).toEqual(attempt)
    api.clearTransferAttempt('1111111111')
    expect(api.readTransferAttempt('1111111111')).toBeNull()
  })
})

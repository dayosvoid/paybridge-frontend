import type { TransferRequest, TransferView } from './transfers'

export interface StoredTransferAttempt {
  request: TransferRequest
  key: string
  result?: TransferView
}

// Keep unresolved attempts through route changes and reloads in this tab. Never
// store tokens here or automatically resubmit a restored attempt.
const attempts = new Map<string, StoredTransferAttempt>()
const storageKey = (source: string) => `paybridge.transferAttempt.${encodeURIComponent(source)}`

export function readTransferAttempt(source: string): StoredTransferAttempt | null {
  if (!source) return null
  try {
    const raw = sessionStorage.getItem(storageKey(source))
    if (raw) {
      const stored = JSON.parse(raw) as StoredTransferAttempt
      const request = stored.request
      if (typeof stored.key === 'string' && stored.key && request?.sourceAccount === source &&
        typeof request.destinationAccount === 'string' && request.destinationAccount.trim() &&
        Number.isSafeInteger(request.amountMinor) && request.amountMinor > 0 &&
        (request.currency === 'NGN' || request.currency === 'USD') &&
        (request.bankCode === null || (typeof request.bankCode === 'string' && request.bankCode.trim())) &&
        (!stored.result || (typeof stored.result.reference === 'string' && stored.result.reference &&
          (stored.result.currency === 'NGN' || stored.result.currency === 'USD') &&
          Number.isSafeInteger(stored.result.amountMinor) && Number.isSafeInteger(stored.result.feeMinor) &&
          Number.isSafeInteger(stored.result.taxMinor)))) {
        attempts.set(source, stored)
        return stored
      }
    }
  } catch { /* The in-memory attempt still protects retries when storage is unavailable. */ }
  return attempts.get(source) ?? null
}

export function saveTransferAttempt(attempt: StoredTransferAttempt) {
  const source = attempt.request.sourceAccount
  attempts.set(source, attempt)
  try { sessionStorage.setItem(storageKey(source), JSON.stringify(attempt)) } catch { /* Use memory. */ }
}

export function clearTransferAttempt(source: string) {
  attempts.delete(source)
  try { sessionStorage.removeItem(storageKey(source)) } catch { /* Storage can be disabled. */ }
}

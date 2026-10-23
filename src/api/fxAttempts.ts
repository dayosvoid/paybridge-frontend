import { isFxConversion, isFxQuote, type FxConversion, type FxQuote } from './fx'

export interface FxAttempt { quote: FxQuote; key: string; result?: FxConversion }
const attempts = new Map<string, FxAttempt>()
const storageKey = (account: string) => `paybridge.fxAttempt.${encodeURIComponent(account)}`
export function readFxAttempt(account: string): FxAttempt | null {
  if (!account) return null
  try {
    const raw = sessionStorage.getItem(storageKey(account))
    if (raw) {
      const data = JSON.parse(raw) as FxAttempt
      if (isFxQuote(data.quote) && data.quote.accountNumber === account && typeof data.key === 'string' && data.key &&
          (!data.result || (isFxConversion(data.result) && data.result.accountNumber === account && data.result.quoteId === data.quote.quoteId))) {
        attempts.set(account, data)
        return data
      }
    }
  } catch { /* Fall back to memory if browser storage is unavailable. */ }
  return attempts.get(account) ?? null
}
export function saveFxAttempt(attempt: FxAttempt) {
  attempts.set(attempt.quote.accountNumber, attempt)
  try { sessionStorage.setItem(storageKey(attempt.quote.accountNumber), JSON.stringify(attempt)) } catch { /* Use memory. */ }
}
export function clearFxAttempt(account: string) {
  attempts.delete(account)
  try { sessionStorage.removeItem(storageKey(account)) } catch { /* Storage can be disabled. */ }
}

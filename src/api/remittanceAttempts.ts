import { isProviderQuote, type ProviderQuoteView, type RemittanceRequest } from './remittances'

export interface RemittanceAttempt { quote: ProviderQuoteView; request: RemittanceRequest; key: string }
const attempts = new Map<string, RemittanceAttempt>()
const storageKey = (account: string) => `paybridge.remittanceAttempt.${encodeURIComponent(account)}`
export function readRemittanceAttempt(account: string): RemittanceAttempt | null {
  if (!account) return null
  try {
    const raw = sessionStorage.getItem(storageKey(account))
    if (raw) {
      const data = JSON.parse(raw) as RemittanceAttempt
      if (isProviderQuote(data.quote) && data.quote.sourceAccount === account && typeof data.key === 'string' && data.key &&
          data.request?.quoteId === data.quote.quoteId && ['beneficiaryName', 'beneficiaryAccount', 'beneficiaryBank'].every(field =>
            typeof data.request[field as keyof RemittanceRequest] === 'string' && data.request[field as keyof RemittanceRequest].trim())) {
        attempts.set(account, data)
        return data
      }
    }
  } catch { /* Browser storage may be unavailable; retain the attempt in memory. */ }
  return attempts.get(account) ?? null
}
// Storage protects retries only. Customer history always comes from GET /mine.
export function saveRemittanceAttempt(data: RemittanceAttempt) {
  attempts.set(data.quote.sourceAccount, data)
  try { sessionStorage.setItem(storageKey(data.quote.sourceAccount), JSON.stringify(data)) } catch { /* Use memory. */ }
}
export function clearRemittanceAttempt(account: string) {
  attempts.delete(account)
  try { sessionStorage.removeItem(storageKey(account)) } catch { /* Storage may be disabled. */ }
}

import { apiRequest } from './client'
import type { Currency } from './types'

export interface FxQuoteRequest {
  accountNumber: string
  sourceCurrency: Currency
  destinationCurrency: Currency
  sourceAmountMinor: number
}
export interface FxQuote extends FxQuoteRequest {
  quoteId: string
  destinationAmountMinor: number
  rate: number | string
  rateType: string
  expiresAt: string
}
export interface FxConversion extends FxQuoteRequest {
  reference: string
  status: string
  quoteId: string
  destinationAmountMinor: number
  rate: number | string
  rateType: string
  failureReason: string | null
  createdAt: string
}

function isAmounts(value: unknown): value is FxQuoteRequest & { destinationAmountMinor: number; rate: number | string; rateType: string } {
  if (!value || typeof value !== 'object') return false
  const data = value as FxQuote
  return typeof data.accountNumber === 'string' && Boolean(data.accountNumber) &&
    data.sourceCurrency === 'NGN' && data.destinationCurrency === 'USD' &&
    Number.isSafeInteger(data.sourceAmountMinor) && data.sourceAmountMinor > 0 &&
    Number.isSafeInteger(data.destinationAmountMinor) && data.destinationAmountMinor >= 0 &&
    (typeof data.rate === 'number' || typeof data.rate === 'string') && Number.isFinite(Number(data.rate)) && Number(data.rate) > 0 &&
    typeof data.rateType === 'string'
}
export function isFxQuote(value: unknown): value is FxQuote {
  const data = value as FxQuote | null
  return isAmounts(data) && typeof data.quoteId === 'string' && Boolean(data.quoteId.trim()) &&
    typeof data.expiresAt === 'string' && Number.isFinite(Date.parse(data.expiresAt))
}
export function isFxConversion(value: unknown): value is FxConversion {
  const data = value as FxConversion | null
  return isAmounts(data) && typeof data.reference === 'string' && Boolean(data.reference.trim()) &&
    typeof data.quoteId === 'string' && typeof data.status === 'string' &&
    (data.failureReason === null || typeof data.failureReason === 'string') &&
    typeof data.createdAt === 'string' && Number.isFinite(Date.parse(data.createdAt))
}

export async function createFxQuote(request: FxQuoteRequest): Promise<FxQuote> {
  const result = await apiRequest<unknown>('/fx/conversions/quotes', { method: 'POST', body: request })
  if (!isFxQuote(result)) throw new Error('The server returned an invalid conversion quote.')
  return result
}
export async function executeFxConversion(quoteId: string, idempotencyKey: string): Promise<FxConversion> {
  const result = await apiRequest<unknown>('/fx/conversions', { method: 'POST', body: { quoteId }, idempotencyKey })
  if (!isFxConversion(result)) throw new Error('The server could not confirm the conversion outcome.')
  return result
}
export async function getFxConversion(reference: string): Promise<FxConversion> {
  const result = await apiRequest<unknown>(`/fx/conversions/${encodeURIComponent(reference)}`)
  if (!isFxConversion(result)) throw new Error('The server returned an invalid conversion record.')
  return result
}

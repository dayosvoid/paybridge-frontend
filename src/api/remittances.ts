import { apiRequest } from './client'

// Verified against ProviderQuoteView / OutboundRemittanceView. Outbound
// remittances fund NGN and pay USD; there is no sourceCurrency DTO field.
export interface ProviderQuoteView {
  quoteId: string
  providerId: string
  providerName: string
  sourceAccount: string
  sourceAmountMinor: number
  feeMinor: number
  totalDebitMinor: number
  destinationCurrency: 'USD'
  destinationAmountMinor: number
  rate: number
  etaMinutes: number
  tags: string[]
  expiresAt: string
}
export interface OutboundRemittanceView {
  reference: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'RETURNED'
  quoteId: string
  providerId: string
  providerReference: string | null
  sourceAccount: string
  sourceAmountMinor: number
  feeMinor: number
  destinationCurrency: 'USD'
  destinationAmountMinor: number
  rate: number
  beneficiaryName: string
  beneficiaryAccount: string
  beneficiaryBank: string
  failureReason: string | null
  createdAt: string
}
export interface RemittanceQuoteRequest { sourceAccount: string; sourceAmountMinor: number; destinationCurrency: 'USD' }
export interface RemittanceRequest { quoteId: string; beneficiaryName: string; beneficiaryAccount: string; beneficiaryBank: string }
export interface OutboundRemittancePage { items: OutboundRemittanceView[]; page: number; size: number; totalItems: number; totalPages: number; hasNext: boolean }

const text = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim())
const nullableText = (value: unknown) => value === null || typeof value === 'string'
const minor = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
function amounts(value: unknown): value is ProviderQuoteView & OutboundRemittanceView {
  if (!value || typeof value !== 'object') return false
  const data = value as ProviderQuoteView
  return text(data.quoteId) && text(data.providerId) && text(data.sourceAccount) && minor(data.sourceAmountMinor) && data.sourceAmountMinor > 0 &&
    minor(data.feeMinor) && data.destinationCurrency === 'USD' && minor(data.destinationAmountMinor) &&
    typeof data.rate === 'number' && Number.isFinite(data.rate) && data.rate > 0
}
export function isProviderQuote(value: unknown): value is ProviderQuoteView {
  return amounts(value) && text(value.providerName) && minor(value.totalDebitMinor) &&
    Number.isSafeInteger(value.etaMinutes) && value.etaMinutes >= 0 && Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string') &&
    typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt))
}
export function isRemittance(value: unknown): value is OutboundRemittanceView {
  return amounts(value) && text(value.reference) && typeof value.status === 'string' &&
    ['PENDING', 'COMPLETED', 'FAILED', 'RETURNED'].includes(value.status) && nullableText(value.providerReference) &&
    text(value.beneficiaryName) && text(value.beneficiaryAccount) && typeof value.beneficiaryBank === 'string' &&
    nullableText(value.failureReason) && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
}

export async function getRemittanceQuotes(request: RemittanceQuoteRequest): Promise<ProviderQuoteView[]> {
  const data = await apiRequest<unknown>('/outbound-remittances/quotes', { method: 'POST', body: request })
  if (!Array.isArray(data) || !data.every(isProviderQuote)) throw new Error('The server returned invalid provider quotes.')
  return data
}
export async function sendRemittance(request: RemittanceRequest, idempotencyKey: string): Promise<OutboundRemittanceView> {
  const data = await apiRequest<unknown>('/outbound-remittances', { method: 'POST', body: request, idempotencyKey })
  if (!isRemittance(data)) throw new Error('The server could not confirm the payout outcome.')
  return data
}
export async function getMyRemittances(page = 0, size = 20): Promise<OutboundRemittancePage> {
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw new Error('Invalid remittance history pagination.')
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await apiRequest<OutboundRemittancePage>(`/outbound-remittances/mine?${query}`)
  if (!data || !Array.isArray(data.items) || !data.items.every(isRemittance) ||
    !Number.isInteger(data.page) || data.page < 0 || !Number.isInteger(data.size) || data.size < 1 || data.size > 100 ||
    !Number.isSafeInteger(data.totalItems) || data.totalItems < 0 || !Number.isInteger(data.totalPages) || data.totalPages < 0 || typeof data.hasNext !== 'boolean') {
    throw new Error('The server returned invalid customer remittance history.')
  }
  return data
}
export async function getRemittance(reference: string): Promise<OutboundRemittanceView> {
  const data = await apiRequest<unknown>(`/outbound-remittances/${encodeURIComponent(reference)}`)
  if (!isRemittance(data)) throw new Error('The server returned invalid remittance details.')
  return data
}

import { apiRequest } from './client'
import type { Currency } from './types'

export type LedgerEntryKind = 'TRANSFER' | 'FEE' | 'TAX' | 'REVERSAL' | 'FEE_REVERSAL' | 'TAX_REVERSAL' | 'INBOUND'
export interface LedgerEntryView {
  id: number
  type: 'DEBIT' | 'CREDIT'
  kind: LedgerEntryKind
  amountMinor: number
  currency: Currency
  reference: string
  transferReference: string
  createdAt: string
  balanceAfterMinor: number | null
}
export interface StatementPage {
  accountNumber: string
  currency: Currency
  currentBalanceMinor: number
  items: LedgerEntryView[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  hasNext: boolean
}
export interface StatementQuery {
  currency: Currency
  type?: LedgerEntryView['type']
  from?: string
  to?: string
  page: number
  size: number
}
export async function getAccountStatement(accountNumber: string, query: StatementQuery, signal?: AbortSignal): Promise<StatementPage> {
  const params = new URLSearchParams({ currency: query.currency, page: String(query.page), size: String(query.size) })
  if (query.type) params.set('type', query.type)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const result = await apiRequest<StatementPage>(`/accounts/${encodeURIComponent(accountNumber)}/transactions?${params}`, { signal })
  // Reject imprecise monetary values rather than displaying rounded Java longs.
  if (result.accountNumber !== accountNumber || result.currency !== query.currency || !Array.isArray(result.items)
    || !Number.isSafeInteger(result.currentBalanceMinor) || result.page !== query.page || result.size !== query.size
    || !Number.isSafeInteger(result.totalItems) || !Number.isSafeInteger(result.totalPages) || typeof result.hasNext !== 'boolean'
    || result.items.some(entry => entry.currency !== query.currency || !Number.isSafeInteger(entry.id)
      || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0
      || (entry.type !== 'DEBIT' && entry.type !== 'CREDIT')
      || typeof entry.reference !== 'string' || typeof entry.transferReference !== 'string'
      || !Number.isFinite(Date.parse(entry.createdAt))
      || (entry.balanceAfterMinor !== null && !Number.isSafeInteger(entry.balanceAfterMinor)))) {
    throw new Error('The server returned an invalid or unsupported ledger statement.')
  }
  return result
}

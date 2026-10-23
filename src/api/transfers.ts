import { apiRequest, newIdempotencyKey } from './client'
import type { Currency } from './types'

export interface TransferRequest {
  sourceAccount: string
  destinationAccount: string
  amountMinor: number
  currency: Currency
  bankCode: string | null
}

export interface TransferView {
  reference: string
  status: string
  sourceAccount: string
  destinationAccount: string
  amountMinor: number
  currency: Currency
  failureReason: string | null
  feeMinor: number
  taxMinor: number
}

export interface TransferPage {
  items: TransferView[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  hasNext: boolean
}

export function createTransfer(
  request: TransferRequest,
  idempotencyKey = newIdempotencyKey(),
): Promise<TransferView> {
  return apiRequest<TransferView>('/transfers', {
    method: 'POST',
    body: request,
    idempotencyKey,
  })
}

export function getTransfer(reference: string): Promise<TransferView> {
  return apiRequest<TransferView>(
    `/transfers/${encodeURIComponent(reference)}`,
  )
}

export function getTransfers(
  account: string,
  status?: string,
  page = 0,
  size = 20,
): Promise<TransferPage> {
  const params = new URLSearchParams({
    account,
    page: String(page),
    size: String(size),
  })

  if (status) {
    params.set('status', status)
  }

  return apiRequest<TransferPage>(`/transfers?${params.toString()}`)
}

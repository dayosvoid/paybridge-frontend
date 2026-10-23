import { apiRequest } from './client'
import type { AccountView } from './types'

export function getAccountBalances(accountNumber: string): Promise<AccountView[]> {
  return apiRequest<AccountView[]>(
    `/accounts/${encodeURIComponent(accountNumber)}/balances`,
  )
}
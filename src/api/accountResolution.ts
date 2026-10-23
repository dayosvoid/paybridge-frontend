import { ApiError, apiRequest } from './client'

/** AccountDetailsController / ResolvedAccountView; no request body. */
export interface ResolvedAccountView {
  accountNumber: string
  accountName: string
  bankName: string
}

export async function resolveBankAccount(accountNumber: string, bankCode: string, signal?: AbortSignal): Promise<ResolvedAccountView> {
  const params = new URLSearchParams({ accountNumber, bankCode })
  let result: ResolvedAccountView
  try {
    result = await apiRequest<ResolvedAccountView>(`/kyc/account-details?${params}`, { signal })
  } catch (error) {
    // This controller returns { error: message }, unlike the global error DTO.
    if (error instanceof ApiError && error.status === 400 && error.message === 'Request failed with status 400') {
      throw new ApiError(error.status, error.code, error.code)
    }
    throw error
  }
  if (!result || result.accountNumber !== accountNumber || typeof result.accountName !== 'string'
    || !result.accountName.trim() || typeof result.bankName !== 'string' || !result.bankName.trim()) {
    throw new Error('The backend returned incomplete or mismatched recipient details. Resolve the account again.')
  }
  return result
}

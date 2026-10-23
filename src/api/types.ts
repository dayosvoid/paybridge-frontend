/** Shapes the PayBridge backend sends. Kept in step with the Java records. */

export type Currency = 'NGN' | 'USD'

export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface UserView {
  id: number
  email: string
  fullName: string
  role: UserRole
  accountNumber: string | null
}

export interface TokenResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresInSeconds: number
  refreshToken: string
  refreshExpiresInSeconds: number
  user: UserView
}

/** Every error the backend returns has this shape. */
export interface ErrorBody {
  error: string
  message: string
}

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface AccountView {
  accountNumber: string
  currency: Currency
  balanceMinor: number
  customerId: number | null
  status: AccountStatus
  bankCode: string | null
  bankName: string | null
  accountName: string | null
}

import { useEffect, useRef, useState } from 'react'
import { resolveBankAccount, type ResolvedAccountView } from '../api/accountResolution'
import { ApiError } from '../api/client'

export function useAccountResolution(external: boolean, accountInput: string, bankInput: string) {
  const accountNumber = accountInput.trim()
  const bankCode = bankInput.trim()
  const identity = JSON.stringify([external, accountInput, bankInput])
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const [state, setState] = useState<{ identity: string; loading?: boolean; data?: ResolvedAccountView; error?: string }>()
  // Explicit invalidation also handles changing away and back to the same inputs.
  function invalidate() {
    generation.current++
    controller.current?.abort()
    setState(undefined)
  }
  useEffect(() => () => { generation.current++; controller.current?.abort() }, [identity])
  const current = external && state?.identity === identity ? state : undefined
  const data = current?.data
  // These are the exact placeholders returned by the current backend gateways.
  const demo = Boolean(data && (data.accountName === 'FAKE ACCOUNT HOLDER' || data.bankName.startsWith('FAKE BANK (')))

  async function resolve() {
    if (!external || current?.loading) return
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setState({ identity, error: 'Enter a bank code and an account number containing exactly 10 digits.' })
      return
    }
    const version = ++generation.current
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setState({ identity, loading: true })
    try {
      const data = await resolveBankAccount(accountNumber, bankCode, request.signal)
      if (generation.current === version) setState({ identity, data })
    } catch (error) {
      if (generation.current !== version) return
      let message = error instanceof Error ? error.message : 'Account lookup failed.'
      if (error instanceof ApiError) {
        if (error.status === 400 || error.status === 422) message = `Invalid account details or unsupported bank: ${message}`
        else if (error.status >= 500 || error.status === 409) message = `Bank provider lookup is unavailable. Please retry. ${message}`
        else if (error.status === 401 || error.status === 403) message = 'You are not authorized to resolve this account. Sign in again or retry.'
      }
      setState({ identity, error: message })
    }
  }
  return { data, demo, verified: Boolean(data && !demo), loading: Boolean(current?.loading), error: current?.error,
    canResolve: external && Boolean(bankCode) && /^\d{10}$/.test(accountNumber), resolve, invalidate }
}

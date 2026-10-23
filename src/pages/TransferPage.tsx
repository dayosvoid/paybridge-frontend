import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccountBalances } from '../api/accounts'
import { ApiError, newIdempotencyKey } from '../api/client'
import { createTransfer, getTransfer, type TransferRequest, type TransferView } from '../api/transfers'
import { clearTransferAttempt, readTransferAttempt, saveTransferAttempt } from '../api/transferAttempts'
import type { AccountView, Currency } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { useAccountResolution } from '../hooks/useAccountResolution'
import { formatMajor, formatMoney, parseMajorToMinor } from '../lib/money'
import TransferHistory from '../components/TransferHistory'

type RightView = 'summary' | 'receipt' | 'pending'
type Attempt = { request: TransferRequest; signature: string; key: string }

export default function TransferPage() {
  const { user } = useAuth()
  const accountNumber = user?.accountNumber?.trim() || ''
  return <TransferWorkspace key={accountNumber} accountNumber={accountNumber} />
}

function TransferWorkspace({ accountNumber }: { accountNumber: string }) {
  const [restored] = useState(() => readTransferAttempt(accountNumber))
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(restored?.request.currency ?? 'NGN')
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [balancesLoading, setBalancesLoading] = useState(Boolean(accountNumber))
  const [balancesError, setBalancesError] = useState('')
  const [balanceVersion, setBalanceVersion] = useState(0)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferResult, setTransferResult] = useState<TransferView | null>(restored?.result ?? null)
  const [uncertain, setUncertain] = useState(Boolean(restored && !restored.result))
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [recipientInput, setRecipientInput] = useState(restored?.request.destinationAccount ?? '')
  const [transferType, setTransferType] = useState<'internal' | 'external'>(restored?.request.bankCode ? 'external' : 'internal')
  const [bankCode, setBankCode] = useState(restored?.request.bankCode ?? '')
  const [bankCodeError, setBankCodeError] = useState('')
  const recipientResolution = useAccountResolution(transferType === 'external', recipientInput, bankCode)
  const [recipientConfirmed, setRecipientConfirmed] = useState(false)
  const [amountInput, setAmountInput] = useState(restored ? formatMajor(restored.request.amountMinor).replace(/,/g, '') : '')
  const [activeRightView, setActiveRightView] = useState<RightView>(restored?.result?.status === 'PENDING' ? 'pending' : restored?.result ? 'receipt' : 'summary')
  const [copyNotice, setCopyNotice] = useState('')
  const attempt = useRef<Attempt | null>(restored ? { request: restored.request, signature: JSON.stringify(restored.request), key: restored.key } : null)
  const submitting = useRef(false)
  const refreshing = useRef(false)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (copyTimer.current) clearTimeout(copyTimer.current) }
  }, [])

  useEffect(() => {
    if (!accountNumber) return
    let cancelled = false
    setBalancesLoading(true)
    setBalancesError('')
    getAccountBalances(accountNumber).then(result => {
      if (cancelled) return
      setAccounts(result)
      if (!attempt.current || (!uncertain && !transferResult)) {
        setSelectedCurrency(previous => result.some(account => account.currency === previous && account.status === 'ACTIVE' && account.accountNumber === accountNumber)
          ? previous : result.find(account => account.status === 'ACTIVE' && account.accountNumber === accountNumber)?.currency ?? previous)
      }
    }).catch(() => {
      if (!cancelled) { setAccounts([]); setBalancesError('Unable to load account balances. Please retry.') }
    }).finally(() => { if (!cancelled) setBalancesLoading(false) })
    return () => { cancelled = true }
  }, [accountNumber, balanceVersion])

  const ngnAccount = accounts.find(account => account.currency === 'NGN' && account.accountNumber === accountNumber)
  const usdAccount = accounts.find(account => account.currency === 'USD' && account.accountNumber === accountNumber)
  const currentAccount = selectedCurrency === 'NGN' ? ngnAccount : usdAccount
  const amountMinor = parseMajorToMinor(amountInput)
  const currencySymbol = selectedCurrency === 'NGN' ? '₦' : '$'
  const remainingBalance = currentAccount && amountMinor !== null ? formatMoney(currentAccount.balanceMinor - amountMinor, selectedCurrency) : '—'
  const previewAmount = amountMinor === null ? '—' : formatMoney(amountMinor, selectedCurrency)
  const formLocked = transferLoading || uncertain || Boolean(transferResult)
  const isSuccess = transferResult?.status === 'SUCCESS'
  const isFailed = transferResult?.status === 'FAILED'
  const terminal = isSuccess || isFailed

  function handleSelectCurrency(currency: Currency) { if (!formLocked) setSelectedCurrency(currency) }
  function handleSetAmountPercent(percent: number) {
    if (formLocked || !currentAccount) return
    const minor = Number(BigInt(currentAccount.balanceMinor) * BigInt(percent) / 100n)
    setAmountInput(formatMajor(minor).replace(/,/g, ''))
  }
  function acceptResult(result: TransferView) {
    if (result.status === 'SUCCESS' || result.status === 'FAILED') clearTransferAttempt(accountNumber)
    else if (attempt.current) saveTransferAttempt({ request: attempt.current.request, key: attempt.current.key, result })
    setTransferResult(result)
    setUncertain(false)
    setStatusError('')
    setActiveRightView(result.status === 'PENDING' ? 'pending' : 'receipt')
    setHistoryVersion(value => value + 1)
    setBalanceVersion(value => value + 1)
  }

  async function handleTriggerTransfer() {
    if (submitting.current || transferResult) return
    setTransferError('')
    setBankCodeError('')
    // An uncertain retry retrieves the original attempt, even if balances have
    // since changed because the first request was processed successfully.
    let request: TransferRequest
    if (uncertain && attempt.current) {
      request = attempt.current.request
    } else {
      if (!accountNumber) { setTransferError('No account is associated with the logged-in user.'); return }
      if (balancesLoading || balancesError || !currentAccount || currentAccount.status !== 'ACTIVE') {
        setTransferError('Select an available active currency account.'); return
      }
      const destinationAccount = recipientInput.trim()
      if (!destinationAccount) { setTransferError('Enter a recipient account number.'); return }
      const externalBankCode = transferType === 'external' ? bankCode.trim() : null
      if (transferType === 'external' && !externalBankCode) { setBankCodeError('Enter the recipient bank code for an external transfer.'); return }
      if (transferType === 'external' && (!recipientResolution.verified || !recipientConfirmed)) {
        setTransferError('Resolve the recipient account and confirm the returned details before sending.'); return
      }
      if (externalBankCode === null && destinationAccount === accountNumber) { setTransferError('You cannot transfer to your own PayBridge account.'); return }
      if (amountMinor === null) { setTransferError('Enter a positive amount with no more than two decimal places.'); return }
      if (amountMinor > currentAccount.balanceMinor) { setTransferError('Insufficient available balance. Fees and tax may also apply.'); return }
      request = { sourceAccount: accountNumber, destinationAccount, amountMinor, currency: selectedCurrency, bankCode: externalBankCode }
    }
    const signature = JSON.stringify(request)
    if (uncertain && attempt.current?.signature !== signature) {
      setTransferError('The previous outcome is unknown. Retry the unchanged transfer before starting another.'); return
    }
    if (attempt.current?.signature !== signature) attempt.current = { request, signature, key: newIdempotencyKey() }
    submitting.current = true
    setTransferLoading(true)
    saveTransferAttempt({ request, key: attempt.current!.key })
    try {
      const result = await createTransfer(request, attempt.current!.key)
      if (!mounted.current) return
      // A malformed successful response is also uncertain; never silently start another transfer.
      if (!result?.reference || !['NGN', 'USD'].includes(result.currency) || !Number.isSafeInteger(result.amountMinor) ||
          !Number.isSafeInteger(result.feeMinor) || !Number.isSafeInteger(result.taxMinor)) {
        setUncertain(true)
        setTransferError('The server response could not confirm the transfer. Check transfer history or retry this same transfer.'); return
      }
      acceptResult(result)
    } catch (error) {
      if (!mounted.current) return
      const unknownOutcome = uncertain || !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 409
      if (!unknownOutcome) clearTransferAttempt(accountNumber)
      setUncertain(unknownOutcome)
      setTransferError(error instanceof Error ? error.message : 'The transfer request failed.')
    } finally {
      submitting.current = false
      if (mounted.current) setTransferLoading(false)
    }
  }

  async function refreshStatus() {
    if (!transferResult || refreshing.current) return
    refreshing.current = true
    setStatusLoading(true)
    setStatusError('')
    try {
      const result = await getTransfer(transferResult.reference)
      if (!mounted.current) return
      if (result?.reference !== transferResult.reference || !['NGN', 'USD'].includes(result.currency) ||
          !Number.isSafeInteger(result.amountMinor) || !Number.isSafeInteger(result.feeMinor) || !Number.isSafeInteger(result.taxMinor)) {
        throw new Error('The server could not confirm the status of this transfer.')
      }
      acceptResult(result)
    } catch (error) {
      if (mounted.current) setStatusError(error instanceof Error ? error.message : 'Unable to refresh transfer status.')
    } finally {
      refreshing.current = false
      if (mounted.current) setStatusLoading(false)
    }
  }

  function startNewTransfer() {
    if (!terminal || transferLoading || statusLoading) return
    attempt.current = null
    setTransferResult(null)
    setTransferError('')
    setStatusError('')
    setBankCodeError('')
    setUncertain(false)
    recipientResolution.invalidate()
    setRecipientConfirmed(false)
    setAmountInput('')
    setActiveRightView('summary')
  }

  async function handleCopyReference() {
    if (!transferResult) return
    try {
      await navigator.clipboard.writeText(transferResult.reference)
      if (mounted.current) setCopyNotice('Reference ID copied!')
    } catch { if (mounted.current) setCopyNotice('Failed to copy reference.') }
    if (mounted.current) {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopyNotice(''), 3000)
    }
  }

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* Toast Notice */}
      {copyNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl bg-primary-container px-4 py-3 text-sm text-on-primary shadow-xl"
        >
          {copyNotice}
        </div>
      )}

        <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col w-full">
            <div className="px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-lg max-w-[1400px] mx-auto w-full">
              {!accountNumber && <p role="alert">No account is associated with the logged-in user.</p>}
              {accountNumber && !balancesLoading && !balancesError && accounts.length === 0 && <p role="status">No currency accounts are available.</p>}
              {/* API Status Banner if loading or error */}
              {(balancesLoading || balancesError) && (
                <div className="bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant flex items-center gap-2">
                  {balancesLoading && <p>Loading balances from PayBridge...</p>}
                  {balancesError && (
                    <p role="alert" className="text-error font-semibold">
                      {balancesError}
                      <button type="button" className="ml-3 underline" disabled={balancesLoading} onClick={() => setBalanceVersion(value => value + 1)}>Retry balances</button>
                    </p>
                  )}
                </div>
              )}

              {/* Breadcrumb & Page Heading */}
              <div className="flex flex-col gap-space-xs">
                <Link
                  className="inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md w-fit"
                  to="/dashboard"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                  <span>Back to Overview</span>
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pt-space-xs">
                  <div>
                    <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                      Transfer money
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                      Send funds to a PayBridge account or an external bank account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                {/* Left Column: Form Card */}
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary-fixed/20 rounded-full blur-2xl pointer-events-none"></div>

                    {/* Section 1: Source Currency Selector */}
                    <div className="flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between">
                        <label className="font-label-md text-label-md text-on-surface">
                          Select source account
                        </label>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Available currency balances
                        </span>
                      </div>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm"
                        id="currency-selectors"
                      >
                        {/* NGN Currency Card */}
                        <button
                          className={`relative text-left p-space-md rounded-xl bg-surface-container-low transition-all duration-150 flex flex-col justify-between h-28 shadow-sm ${
                            selectedCurrency === 'NGN'
                              ? 'ring-2 ring-primary-container'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          aria-label="Use NGN account" aria-pressed={selectedCurrency === 'NGN'}
                          disabled={formLocked || balancesLoading || !ngnAccount || ngnAccount.status !== 'ACTIVE'}
                          onClick={() => handleSelectCurrency('NGN')}
                          type="button"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm font-bold text-on-surface">
                                ₦
                              </div>
                              <div>
                                <span className="font-label-md text-label-md text-on-surface block leading-tight">
                                  NGN Wallet
                                </span>
                                <span className="font-code-token text-[11px] text-on-surface-variant block tracking-normal">
                                  {ngnAccount ? '...' + ngnAccount.accountNumber.slice(-4) : 'Unavailable'}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`material-symbols-outlined text-secondary text-[20px] ${
                                selectedCurrency === 'NGN' ? '' : 'hidden'
                              }`}
                            >
                              check_circle
                            </span>
                          </div>
                          <div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant block">
                              Available balance
                            </span>
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                              {balancesLoading ? 'Loading…' : ngnAccount ? formatMoney(ngnAccount.balanceMinor, 'NGN') : 'Unavailable'}
                              {ngnAccount && ngnAccount.status !== 'ACTIVE' && <span className="block text-body-sm">{ngnAccount.status}</span>}
                            </span>
                          </div>
                        </button>

                        {/* USD Currency Card */}
                        <button
                          className={`relative text-left p-space-md rounded-xl bg-surface-container-low transition-all duration-150 flex flex-col justify-between h-28 shadow-sm ${
                            selectedCurrency === 'USD'
                              ? 'ring-2 ring-primary-container'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          aria-label="Use USD account" aria-pressed={selectedCurrency === 'USD'}
                          disabled={formLocked || balancesLoading || !usdAccount || usdAccount.status !== 'ACTIVE'}
                          onClick={() => handleSelectCurrency('USD')}
                          type="button"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm font-bold text-on-surface">
                                $
                              </div>
                              <div>
                                <span className="font-label-md text-label-md text-on-surface block leading-tight">
                                  USD Wallet
                                </span>
                                <span className="font-code-token text-[11px] text-on-surface-variant block tracking-normal">
                                  {usdAccount ? '...' + usdAccount.accountNumber.slice(-4) : 'Unavailable'}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`material-symbols-outlined text-secondary text-[20px] ${
                                selectedCurrency === 'USD' ? '' : 'hidden'
                              }`}
                            >
                              check_circle
                            </span>
                          </div>
                          <div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant block">
                              Available balance
                            </span>
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                              {balancesLoading ? 'Loading…' : usdAccount ? formatMoney(usdAccount.balanceMinor, 'USD') : 'Unavailable'}
                              {usdAccount && usdAccount.status !== 'ACTIVE' && <span className="block text-body-sm">{usdAccount.status}</span>}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-space-xs">
                      <label htmlFor="transfer-type" className="font-label-md text-label-md">Transfer type</label>
                      <select id="transfer-type" disabled={formLocked} value={transferType} onChange={event => {
                        setTransferType(event.target.value as 'internal' | 'external')
                        setBankCodeError('')
                        recipientResolution.invalidate()
                        setRecipientConfirmed(false)
                        setTransferError('')
                      }}
                        className="bg-surface-container-low p-3 rounded-lg">
                        <option value="internal">Internal — PayBridge account</option><option value="external">External — bank account</option>
                      </select>
                    </div>
                    {transferType === 'external' && <div role="group" aria-label="Destination bank" className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between gap-space-sm">
                        <label htmlFor="bank-code" className="font-label-md text-label-md text-on-surface">Bank Code</label>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Required</span>
                      </div>
                      <input id="bank-code" name="bankCode" type="text" required value={bankCode} disabled={formLocked}
                        aria-invalid={Boolean(bankCodeError)} aria-describedby={bankCodeError ? 'bank-code-hint bank-code-error' : 'bank-code-hint'}
                        onChange={event => { recipientResolution.invalidate(); setRecipientConfirmed(false); setTransferError(''); setBankCode(event.target.value); setBankCodeError('') }}
                        className="w-full bg-surface-container-low text-on-surface font-code-token text-[13px] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                        placeholder="Enter destination bank code" />
                      <p id="bank-code-hint" className="font-body-sm text-body-sm text-on-surface-variant">Enter the destination bank code supplied by the recipient.</p>
                      {bankCodeError && <p id="bank-code-error" role="alert" className="text-sm font-medium text-red-600">{bankCodeError}</p>}
                    </div>}
                    {/* Section 2: Recipient Account Input */}
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-label-md text-label-md text-on-surface"
                          htmlFor="recipient-input"
                        >
                          Recipient account number
                        </label>

                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-space-md text-[20px] text-on-surface-variant">
                          person_search
                        </span>
                        <input
                          className="w-full bg-surface-container-low text-on-surface font-code-token text-[13px] tracking-wider pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                          id="recipient-input"
                          disabled={formLocked}
                          onChange={(e) => {
                            recipientResolution.invalidate()
                            setRecipientConfirmed(false)
                            setTransferError('')
                            setRecipientInput(e.target.value)
                          }}
                          placeholder="Enter recipient account number"
                          type="text"
                          value={recipientInput}
                        />
                      </div>

                    </div>

                    {transferType === 'external' && <section aria-label="Recipient bank account resolution" className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-sm">
                      <button type="button" className="rounded-lg bg-surface-container px-3 py-2 text-on-surface disabled:opacity-40"
                        disabled={formLocked || !accountNumber || !recipientResolution.canResolve || recipientResolution.loading}
                        onClick={() => { setRecipientConfirmed(false); setTransferError(''); void recipientResolution.resolve() }}>
                        {recipientResolution.loading ? 'Resolving account…' : 'Resolve account'}
                      </button>
                      <p className="text-body-sm text-on-surface-variant">Enter the bank code and a 10-digit account number, then resolve the recipient bank account. This lookup is not customer identity verification.</p>
                      {recipientResolution.loading && <p role="status">Resolving recipient bank account…</p>}
                      {recipientResolution.error && <p role="alert" className="text-error">{recipientResolution.error}</p>}
                      {recipientResolution.data && <div role="status">
                        <p>Account holder: {recipientResolution.data.accountName}</p>
                        <p>Bank: {recipientResolution.data.bankName}</p>
                        <p>Account number: {recipientResolution.data.accountNumber}</p>
                        <p>Bank code: {bankCode.trim()}</p>
                      </div>}
                      {recipientResolution.demo && <p role="alert" className="text-error">The backend returned demo account details. This recipient is not verified and a new external transfer cannot be confirmed.</p>}
                      {recipientResolution.verified && !uncertain && <label className="flex items-start gap-2 text-body-sm">
                        <input type="checkbox" checked={recipientConfirmed} disabled={formLocked} onChange={event => setRecipientConfirmed(event.target.checked)} />
                        I confirm the resolved recipient bank, account number, and account holder name.
                      </label>}
                      {uncertain && <p className="text-body-sm">Retry uses the original transfer details and idempotency key. No new recipient lookup is required to recover that attempt.</p>}
                    </section>}

                    {/* Section 3: Transfer Amount Input */}
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-label-md text-label-md text-on-surface"
                          htmlFor="amount-input"
                        >
                          Amount
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface transition-colors"
                            disabled={formLocked || balancesLoading || !currentAccount}
                            onClick={() => handleSetAmountPercent(25)}
                            type="button"
                          >
                            25%
                          </button>
                          <button
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface transition-colors"
                            disabled={formLocked || balancesLoading || !currentAccount}
                            onClick={() => handleSetAmountPercent(50)}
                            type="button"
                          >
                            50%
                          </button>
                          <button
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface transition-colors"
                            disabled={formLocked || balancesLoading || !currentAccount}
                            onClick={() => handleSetAmountPercent(85)}
                            type="button"
                          >
                            85%
                          </button>
                        </div>
                      </div>

                      <div className="relative flex items-center bg-surface-container-low rounded-xl px-space-md py-3 focus-within:ring-2 focus-within:ring-secondary transition-all">
                        <span className="font-headline-md text-headline-md font-bold text-on-surface mr-2">
                          {currencySymbol}
                        </span>
                        <input
                          className="w-full bg-transparent font-display-lg text-display-lg font-bold text-on-surface focus:outline-none tracking-tight"
                          id="amount-input"
                          disabled={formLocked} inputMode="decimal"
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder="0.00"
                          type="text"
                          value={amountInput}
                        />
                        <div className="flex items-center gap-space-xs bg-surface-container-highest px-space-sm py-1 rounded font-label-sm text-label-sm text-on-surface">
                          <span>{selectedCurrency}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1 pt-1 font-body-sm text-body-sm">
                        <span className="text-on-surface-variant">
                          Balance less amount (excludes fees and tax):
                        </span>
                        <span className="font-label-md text-label-md text-on-surface">
                          {remainingBalance}
                        </span>
                      </div>
                    </div>

                    {/* Section 4: Primary Action Button */}
                    <div className="pt-space-xs flex flex-col gap-space-sm">
                      <button
                        className="w-full py-3.5 px-gutter rounded-xl bg-primary-container hover:bg-inverse-surface active:scale-[0.99] text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-sm shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleTriggerTransfer}
                        disabled={transferLoading || Boolean(transferResult) || (!uncertain && (balancesLoading || Boolean(balancesError) || !accountNumber || !currentAccount || currentAccount.status !== 'ACTIVE'))}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {transferLoading ? 'hourglass_top' : 'send'}
                        </span>
                        <span>
                          {transferLoading
                            ? 'Submitting transfer...'
                            : uncertain ? 'Retry same transfer' : 'Send ' + previewAmount + ' Now'}
                        </span>
                      </button>

                      {uncertain && <p role="status" className="text-amber-800">The outcome is unknown. Do not start another transfer. Check transfer history or use Retry same transfer to safely retry the original request.</p>}
                      {transferError && (
                        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                          {transferError}
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column: Summary, Security & Interactive Receipt States */}
                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  <div className="bg-surface-container-low rounded-xl p-space-xs flex items-center justify-between text-on-surface shadow-inner">
                    <span className="font-label-sm text-label-sm text-on-surface-variant pl-space-sm">
                      Transfer details:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                          activeRightView === 'summary'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        onClick={() => setActiveRightView('summary')}
                        type="button"
                      >
                        Summary
                      </button>
                      <button
                        disabled={!transferResult}
                        className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          activeRightView === 'receipt'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        onClick={() => setActiveRightView('receipt')}
                        type="button"
                      >
                        Receipt
                      </button>
                      <button
                        disabled={transferResult?.status !== 'PENDING'}
                        className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          activeRightView === 'pending'
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        onClick={() => setActiveRightView('pending')}
                        type="button"
                      >
                        Pending
                      </button>
                    </div>
                  </div>

                  {/* VIEW A: Summary */}
                  {activeRightView === 'summary' && (
                    <div className="flex flex-col gap-space-md">
                      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                        <div className="flex items-center justify-between pb-space-xs">
                          <h2 className="font-headline-sm text-headline-sm text-on-surface">
                            Transfer Summary
                          </h2>
<span className="font-label-sm text-label-sm text-on-surface-variant">Fees and tax are confirmed in the transfer response.</span>
                        </div>
                        <div className="flex flex-col gap-space-sm text-body-md font-body-md">
                          <div className="flex items-center justify-between py-1.5 bg-surface-container-low/40 px-space-sm rounded-lg">
                            <span className="text-on-surface-variant">
                              Source Account
                            </span>
                            <span className="font-label-md text-label-md text-on-surface">
                              {accountNumber || 'Unavailable'} · {selectedCurrency}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 bg-surface-container-low/40 px-space-sm rounded-lg">
                            <span className="text-on-surface-variant">
                              Recipient
                            </span>
                            <span className="font-label-md text-label-md text-on-surface">
                              {recipientInput || '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 px-space-sm">
                            <span className="text-on-surface-variant">
                              Transfer Amount
                            </span>
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              {previewAmount}
                            </span>
                          </div>
                        </div>
                        {transferType === 'external' && <div className="text-body-sm text-on-surface-variant">
                          {recipientResolution.data ? <><p>Resolved bank: {recipientResolution.data.bankName}</p><p>Resolved account: {recipientResolution.data.accountNumber}</p><p>Account holder name: {recipientResolution.data.accountName}</p><p>Bank code: {bankCode.trim()}</p><p>{recipientResolution.demo ? 'Demo details — not verified' : recipientConfirmed ? 'Recipient details confirmed' : 'Review and confirm recipient details before sending.'}</p></>
                            : <p>Recipient account is unresolved. Resolve and review the bank account details before confirming an external transfer.</p>}
                        </div>}
                      </div>
                    </div>
                  )}

                  {/* VIEW B: Receipt / Result View */}
                  {activeRightView === 'receipt' && transferResult && (
                    <div className="flex flex-col gap-space-md">
                      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                        {/* Status Icon */}
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center mb-space-sm shadow-sm ${
                            isSuccess
                              ? 'bg-secondary-container text-on-secondary-container'
                              : isFailed
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[36px]">
                            {isSuccess ? 'check_circle' : isFailed ? 'error' : 'info'}
                          </span>
                        </div>

                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Transfer status:{' '}
                          <strong className={isSuccess ? 'text-secondary' : isFailed ? 'text-red-600' : ''}>
                            {transferResult?.status ?? 'Unknown'}
                          </strong>
                        </span>

                        <h3 className="font-display-lg text-display-lg text-on-surface font-bold mt-1">
                          {transferResult ? formatMoney(transferResult.amountMinor, transferResult.currency) : '—'}
                        </h3>

                        <div className="w-full bg-surface-container-low rounded-xl p-space-md my-space-md flex flex-col gap-2.5 text-left text-body-sm font-body-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-on-surface-variant">
                              Reference ID
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-code-token text-[12px] text-on-surface font-semibold tracking-normal">
                                {transferResult?.reference ?? 'No reference yet'}
                              </span>
                              <button
                                className="text-secondary hover:text-on-secondary-container"
                                onClick={handleCopyReference}
                                title="Copy reference"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  content_copy
                                </span>
                              </button>
                            </div>
                          </div>
                          {transferResult && (
                            <div className="w-full text-left text-sm space-y-2 pt-2 border-t border-outline-variant/30">
                              <div className="flex justify-between">
                                <span>Network fee</span>
                                <strong>
                                  {formatMoney(
                                    transferResult.feeMinor,
                                    transferResult.currency,
                                  )}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Tax</span>
                                <strong>
                                  {formatMoney(
                                    transferResult.taxMinor,
                                    transferResult.currency,
                                  )}
                                </strong>
                              </div>
                              {transferResult.failureReason && (
                                <p className="text-red-600 pt-2 font-medium">
                                  Reason: {transferResult.failureReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {!terminal && <p className="text-body-sm text-on-surface-variant">The final outcome is not confirmed. Refresh the status before starting a new transfer.</p>}
                        {statusError && <p role="alert">{statusError}</p>}
                        {!terminal && <button type="button" disabled={statusLoading} onClick={refreshStatus} className="rounded-lg bg-surface-container p-3">{statusLoading ? 'Refreshing status…' : 'Refresh Status'}</button>}
                        <div className="w-full grid grid-cols-2 gap-space-sm">
                          <button
                            className="w-full py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                            onClick={() => window.print()}
                            type="button"
                          >
                            Print / Save PDF
                          </button>
                          <button
                            className="w-full py-3 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md transition-colors"
                            disabled={!terminal || statusLoading}
                            onClick={startNewTransfer}
                            type="button"
                          >
                            New Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW C: Pending */}
                  {activeRightView === 'pending' && transferResult && (
                    <div className="flex flex-col gap-space-md">
                      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-space-sm shadow-sm">
                          <span className="material-symbols-outlined text-[36px]">
                            schedule
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-tertiary-fixed-variant font-bold">
                          Transfer pending
                        </span>
                        <h3 className="font-display-lg text-display-lg text-on-surface font-bold mt-1">
                          {transferResult ? formatMoney(transferResult.amountMinor, transferResult.currency) : '—'}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mt-1">
                          The provider has not yet confirmed the final outcome. Use Refresh Status to check again.
                        </p>
                        <p className="mt-3 font-code-token">{transferResult.reference}</p>
                        <p className="text-body-sm">Fee: {formatMoney(transferResult.feeMinor, transferResult.currency)} · Tax: {formatMoney(transferResult.taxMinor, transferResult.currency)}</p>
                        <button type="button" onClick={handleCopyReference} className="mt-2 text-secondary">Copy reference</button>
                        {statusError && <p role="alert">{statusError}</p>}
                        <button type="button" onClick={refreshStatus} disabled={statusLoading} className="mt-3 rounded-lg bg-primary-container p-3 text-on-primary">{statusLoading ? 'Refreshing status…' : 'Refresh Status'}</button>

                      </div>
                    </div>
                  )}
                </div>
              </div>
              <TransferHistory accountNumber={accountNumber} version={historyVersion} />
            </div>
          </div>
        </div>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccountBalances } from '../api/accounts'
import type { AccountView } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../lib/money'

type AccountType = 'ngn' | 'usd'
type FilterType = 'all' | 'ngn' | 'usd'
type BalanceState = { accountNumber: string; status: 'loading' | 'success' | 'error'; accounts: AccountView[] }

function maskNumber(number: string) {
  return number.length > 4 ? '•'.repeat(number.length - 4) + number.slice(-4) : '•'.repeat(number.length)
}

export default function AccountsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const accountNumber = user?.accountNumber?.trim() || ''
  const [result, setResult] = useState<BalanceState>({ accountNumber: '', status: 'loading', accounts: [] })
  const [attempt, setAttempt] = useState(0)
  const [balancesHidden, setBalancesHidden] = useState(false)
  const [ngnMasked, setNgnMasked] = useState(true)
  const [usdMasked, setUsdMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyAttempt = useRef(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountType>('ngn')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    let cancelled = false
    copyAttempt.current++
    if (copyTimer.current) clearTimeout(copyTimer.current)
    setIsDrawerOpen(false)
    setCopiedKey(null)
    setCopyError('')
    setNgnMasked(true)
    setUsdMasked(true)
    if (!accountNumber) return
    setResult({ accountNumber, status: 'loading', accounts: [] })
    getAccountBalances(accountNumber).then(accounts => {
      if (!cancelled) setResult({ accountNumber, status: 'success', accounts })
    }).catch(() => {
      if (!cancelled) setResult({ accountNumber, status: 'error', accounts: [] })
    })
    return () => { cancelled = true }
  }, [accountNumber, attempt])

  useEffect(() => () => {
    copyAttempt.current++
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  useEffect(() => {
    if (!isDrawerOpen) return
    const previous = document.activeElement as HTMLElement | null
    document.getElementById('close-account-details')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDrawerOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape); previous?.focus() }
  }, [isDrawerOpen])

  const loading = Boolean(accountNumber) && (result.accountNumber !== accountNumber || result.status === 'loading')
  const error = Boolean(accountNumber) && result.accountNumber === accountNumber && result.status === 'error'
  const accounts = accountNumber && result.accountNumber === accountNumber && result.status === 'success' ? result.accounts : []
  const ngnAccount = accounts.find(account => account.currency === 'NGN')
  const usdAccount = accounts.find(account => account.currency === 'USD')
  const walletCount = Number(Boolean(ngnAccount)) + Number(Boolean(usdAccount))
  const selected = selectedAccount === 'ngn' ? ngnAccount : usdAccount
  const activeAccountData = selected ? {
    title: selected.currency + ' Wallet',
    badge: selected.currency === 'NGN' ? '₦' : '$',
    badgeBg: selected.currency === 'NGN' ? 'bg-secondary' : 'bg-primary-container',
    badgeText: 'text-on-primary',
    balance: balancesHidden ? '••••••••' : formatMoney(selected.balanceMinor, selected.currency),
    name: selected.accountName,
    accountNum: selected.accountNumber,
    currency: selected.currency,
    bank: selected.bankName,
    bankCode: selected.bankCode,
    status: selected.status,
  } : null

  async function handleCopy(e: React.MouseEvent, text: string | null, key: string) {
    e.stopPropagation()
    if (!text) return
    const currentAttempt = ++copyAttempt.current
    if (copyTimer.current) clearTimeout(copyTimer.current)
    setCopyError('')
    setCopiedKey(null)
    try {
      await navigator.clipboard.writeText(text)
      if (currentAttempt !== copyAttempt.current) return
      setCopiedKey(key)
      copyTimer.current = setTimeout(() => setCopiedKey(null), 1800)
    } catch {
      if (currentAttempt === copyAttempt.current) setCopyError('Could not copy. Please select the value and copy it manually.')
    }
  }

  function openDrawer(accountKey: AccountType) {
    setSelectedAccount(accountKey)
    setIsDrawerOpen(true)
  }
  function closeDrawer() { setIsDrawerOpen(false) }

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
        <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col w-full">
            <div className="px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-lg">
              
              {/* Header & Breadcrumbs */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
                    <span className="hover:text-on-surface cursor-pointer">Dashboard</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-on-surface font-semibold">Accounts</span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Accounts</h1>
                    <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm">
                      Account balances
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    View your NGN and USD balances and account details.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-sm">
                  <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-lowest shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">{loading ? 'Loading wallets…' : walletCount + ' Wallets'}</span>
                    
                  </div>
                  <button
                    type="button"
                    disabled={walletCount === 0}
                    onClick={() => openDrawer(ngnAccount ? 'ngn' : 'usd')}
                    className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-inverse-surface shadow-sm transition-all active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>View Account Details</span>
                  </button>
                </div>
              </div>

              {/* Currency filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
                <div className="flex items-center gap-space-xs overflow-x-auto w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    aria-pressed={activeFilter === 'all'}
                    className={`px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all ${
                      activeFilter === 'all'
                        ? 'bg-primary-container text-on-primary'
                        : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    All Accounts ({walletCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('ngn')}
                    aria-pressed={activeFilter === 'ngn'}
                    className={`px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all ${
                      activeFilter === 'ngn'
                        ? 'bg-primary-container text-on-primary'
                        : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    NGN ({ngnAccount ? 1 : 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('usd')}
                    aria-pressed={activeFilter === 'usd'}
                    className={`px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all ${
                      activeFilter === 'usd'
                        ? 'bg-primary-container text-on-primary'
                        : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    USD ({usdAccount ? 1 : 0})
                  </button>
                </div>

              </div>

              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex items-center justify-between gap-space-md">
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold">Wallet balances</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Balances are shown separately by currency.</p>
                </div>
                <button type="button" onClick={() => setBalancesHidden(value => !value)}
                  aria-label={balancesHidden ? 'Show balances' : 'Hide balances'}
                  className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant">
                  <span aria-hidden="true" className="material-symbols-outlined">{balancesHidden ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {!accountNumber && <p role="status" className="bg-surface-container-lowest rounded-xl p-space-lg">No account is associated with this customer.</p>}
              {accountNumber && !loading && !error && walletCount === 0 && <p role="status" className="bg-surface-container-lowest rounded-xl p-space-lg">No accounts are available.</p>}
              {accountNumber && !loading && !error && walletCount > 0 && activeFilter !== 'all' && !(activeFilter === 'ngn' ? ngnAccount : usdAccount) && <p role="status" className="bg-surface-container-lowest rounded-xl p-space-lg">No {activeFilter.toUpperCase()} account is available.</p>}
              {copyError && <p role="alert" className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl">{copyError}</p>}
              {copiedKey && <p role="status" className="fixed bottom-4 right-4 z-[70] rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl">Copied to clipboard.</p>}

              {/* Active State View: Core Account Cards */}
              {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
                  {/* Card A: NGN Wallet */}
                  {ngnAccount && (activeFilter === 'all' || activeFilter === 'ngn') && (
                    <div role="region" aria-label="NGN wallet" className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between overflow-hidden group hover:shadow-md transition-all duration-200">
                      <div className="p-space-lg flex flex-col gap-space-md">
                        {/* Top Bar */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center font-display-lg text-headline-sm font-bold shadow-sm">
                              <span>₦</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                NGN Wallet
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Nigerian Naira
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-space-sm py-1 rounded-full ${ngnAccount.status === 'ACTIVE' ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span className="font-label-sm text-[11px] font-semibold tracking-wide">{ngnAccount.status}</span>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="flex flex-col gap-0.5 pt-space-xs">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                            Available Balance
                          </span>
                          <div className="flex items-baseline gap-space-xs">
                            <span
                              className={`font-display-lg text-display-lg font-bold text-on-surface tracking-tight ${
                                balancesHidden ? 'blur-sm select-none' : ''
                              }`}
                            >
                              {balancesHidden ? '••••••••' : formatMoney(ngnAccount.balanceMinor, 'NGN')}
                            </span>
                            <span className="font-label-sm text-label-sm text-secondary font-semibold">NGN</span>
                          </div>
                        </div>

                        {/* Account Ledger Details */}
                        <div className="bg-surface-container-low/70 rounded-xl p-space-md flex flex-col gap-space-sm">
                          {/* Account Number Row */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Account Number</span>
                            <div className="flex items-center gap-space-xs">
                              <span className="font-code-token text-code-token text-on-surface font-semibold tracking-normal">
                                {ngnMasked ? maskNumber(ngnAccount.accountNumber) : ngnAccount.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => setNgnMasked((prev) => !prev)}
                                className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                                title="Reveal/Mask number"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {ngnMasked ? 'visibility' : 'visibility_off'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, ngnAccount.accountNumber, 'ngn-acc')}
                                className="p-1 text-on-surface-variant hover:text-secondary rounded transition-colors"
                                title="Copy Account Number"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {copiedKey === 'ngn-acc' ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className="h-px bg-surface-variant/40 w-full"></div>

                          {/* Account Name */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Account Name</span>
                            <span className="font-label-md text-label-md text-on-surface font-semibold text-right">
                              {ngnAccount.accountName || 'Not provided'}
                            </span>
                          </div>
                          <div className="h-px bg-surface-variant/40 w-full"></div>

                          {/* Bank */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Bank</span>
                            <div className="flex items-center gap-1.5 text-right">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                                {ngnAccount.bankName || 'Not provided'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between gap-space-sm">
                        <button
                          type="button"
                          onClick={() => openDrawer('ngn')}
                          className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">info</span>
                          <span>View Full Details</span>
                        </button>
                        <div className="flex items-center gap-space-xs">
                          <button
                            type="button"
                            onClick={() => navigate('/transactions')}
                            className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md shadow-sm transition-all"
                          >
                            Transactions
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/transfers')}
                            className="flex items-center gap-1 px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-inverse-surface shadow-sm transition-all active:scale-[0.99]"
                          >
                            <span className="material-symbols-outlined text-[16px]">north_east</span>
                            <span>Transfer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card B: USD Wallet */}
                  {usdAccount && (activeFilter === 'all' || activeFilter === 'usd') && (
                    <div role="region" aria-label="USD wallet" className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col justify-between overflow-hidden group hover:shadow-md transition-all duration-200">
                      <div className="p-space-lg flex flex-col gap-space-md">
                        {/* Top Bar */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary-container flex items-center justify-center font-display-lg text-headline-sm font-bold shadow-sm">
                              <span>$</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                USD Wallet
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                United States Dollar
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-space-sm py-1 rounded-full ${usdAccount.status === 'ACTIVE' ? 'bg-secondary-container/40 text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span className="font-label-sm text-[11px] font-semibold tracking-wide">{usdAccount.status}</span>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="flex flex-col gap-0.5 pt-space-xs">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                            Available Balance
                          </span>
                          <div className="flex items-baseline gap-space-xs">
                            <span
                              className={`font-display-lg text-display-lg font-bold text-on-surface tracking-tight ${
                                balancesHidden ? 'blur-sm select-none' : ''
                              }`}
                            >
                              {balancesHidden ? '••••••••' : formatMoney(usdAccount.balanceMinor, 'USD')}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">USD</span>
                          </div>
                        </div>

                        {/* Account Ledger Details */}
                        <div className="bg-surface-container-low/70 rounded-xl p-space-md flex flex-col gap-space-sm">
                          {/* Account Number Row */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Account Number</span>
                            <div className="flex items-center gap-space-xs">
                              <span className="font-code-token text-code-token text-on-surface font-semibold tracking-normal">
                                {usdMasked ? maskNumber(usdAccount.accountNumber) : usdAccount.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => setUsdMasked((prev) => !prev)}
                                className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                                title="Reveal/Mask number"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {usdMasked ? 'visibility' : 'visibility_off'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, usdAccount.accountNumber, 'usd-acc')}
                                className="p-1 text-on-surface-variant hover:text-secondary rounded transition-colors"
                                title="Copy Account Number"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {copiedKey === 'usd-acc' ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className="h-px bg-surface-variant/40 w-full"></div>

                          {/* Account Name */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Account Name</span>
                            <span className="font-label-md text-label-md text-on-surface font-semibold text-right">
                              {usdAccount.accountName || 'Not provided'}
                            </span>
                          </div>
                          <div className="h-px bg-surface-variant/40 w-full"></div>

                          {/* Bank */}
                          <div className="flex items-center justify-between">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Bank</span>
                            <div className="flex items-center gap-1.5 text-right">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                                {usdAccount.bankName || 'Not provided'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between gap-space-sm">
                        <button
                          type="button"
                          onClick={() => openDrawer('usd')}
                          className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">info</span>
                          <span>View Full Details</span>
                        </button>
                        <div className="flex items-center gap-space-xs">
                          <button
                            type="button"
                            onClick={() => navigate('/transactions')}
                            className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md shadow-sm transition-all"
                          >
                            Transactions
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/transfers')}
                            className="flex items-center gap-1 px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-inverse-surface shadow-sm transition-all active:scale-[0.99]"
                          >
                            <span className="material-symbols-outlined text-[16px]">north_east</span>
                            <span>Transfer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Skeleton Loading State View */}
              {loading && (
                <div role="status" aria-label="Loading account balances" className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
                  <span className="sr-only">Loading account balances…</span>
                  <div aria-hidden="true" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-space-sm">
                        <div className="w-12 h-12 bg-surface-container rounded-xl"></div>
                        <div className="flex flex-col gap-2">
                          <div className="w-36 h-5 bg-surface-container rounded"></div>
                          <div className="w-24 h-3 bg-surface-container-low rounded"></div>
                        </div>
                      </div>
                      <div className="w-24 h-6 bg-surface-container rounded-full"></div>
                    </div>
                    <div className="w-48 h-10 bg-surface-container rounded mt-4"></div>
                    <div className="h-28 bg-surface-container-low rounded-xl"></div>
                    <div className="h-10 bg-surface-container rounded mt-2"></div>
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-space-sm">
                        <div className="w-12 h-12 bg-surface-container rounded-xl"></div>
                        <div className="flex flex-col gap-2">
                          <div className="w-36 h-5 bg-surface-container rounded"></div>
                          <div className="w-24 h-3 bg-surface-container-low rounded"></div>
                        </div>
                      </div>
                      <div className="w-24 h-6 bg-surface-container rounded-full"></div>
                    </div>
                    <div className="w-48 h-10 bg-surface-container rounded mt-4"></div>
                    <div className="h-28 bg-surface-container-low rounded-xl"></div>
                    <div className="h-10 bg-surface-container rounded mt-2"></div>
                  </div>
                </div>
              )}

              {/* API Error State View */}
              {error && (
                <div role="alert" className="flex flex-col items-center justify-center p-space-lg bg-surface-container-lowest rounded-xl shadow-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-space-sm">
                    <span className="material-symbols-outlined text-[32px]">warning</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Unable to load account balances
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1 mb-space-md">
                    Your balances could not be loaded. Please try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttempt(value => value + 1)}
                    className="flex items-center gap-space-xs px-space-lg py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-inverse-surface transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Currency balance information */}
              <div className="bg-primary-container text-on-primary rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-inverse-surface flex items-center justify-center text-secondary-fixed">
                    <span className="material-symbols-outlined text-[24px]">info</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-primary font-bold">
                      Balances by currency
                    </span>
                    <span className="font-body-sm text-body-sm text-primary-fixed-dim">
                      A combined portfolio value requires a live FX quote. NGN and USD balances are not added together.
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      {/* Slide-Over Account Details Drawer Modal */}
      {isDrawerOpen && activeAccountData && <div
        onClick={closeDrawer}
        className={`fixed inset-0 bg-primary-container/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          role="dialog" aria-modal="true" aria-labelledby="account-details-title"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-surface-container-lowest shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-space-lg flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-space-sm">
              <div
                className={`w-10 h-10 rounded-xl ${activeAccountData.badgeBg} ${activeAccountData.badgeText} flex items-center justify-center font-bold text-headline-sm`}
              >
                {activeAccountData.badge}
              </div>
              <div className="flex flex-col">
                <span id="account-details-title" className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">
                  {activeAccountData.title}
                </span>
                <span className="font-label-sm text-label-sm text-secondary">{activeAccountData.status}</span>
              </div>
            </div>
            <button
              type="button"
              id="close-account-details" aria-label="Close account details"
              onClick={closeDrawer}
              className="p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          {/* Account details */}
          <div className="p-space-lg flex-1 overflow-y-auto flex flex-col gap-space-lg">
            {/* Balance Summary Callout */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Available Balance</span>
              <span className="font-display-lg text-headline-md font-bold text-on-surface font-code-token">
                {activeAccountData.balance}
              </span>
              <span className="font-body-sm text-[12px] text-secondary flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {activeAccountData.status}
              </span>
            </div>

            {/* Bank details supplied by the API */}
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Account details
              </span>

              {/* Beneficiary Name */}
              <div className="p-space-sm rounded-lg bg-surface flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Beneficiary / Account Name</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    {activeAccountData.name || 'Not provided'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!activeAccountData.name} aria-label="Copy account name"
                  onClick={(e) => handleCopy(e, activeAccountData.name, 'drawer-name')}
                  className="p-1.5 text-on-surface-variant hover:text-secondary rounded"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedKey === 'drawer-name' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>

              {/* Account Number */}
              <div className="p-space-sm rounded-lg bg-surface flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Account Number</span>
                  <span className="font-code-token text-body-lg text-on-surface font-bold">
                    {activeAccountData.accountNum}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Copy account number"
                  onClick={(e) => handleCopy(e, activeAccountData.accountNum, 'drawer-num')}
                  className="p-1.5 text-on-surface-variant hover:text-secondary rounded"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedKey === 'drawer-num' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>

              {/* Denomination */}
              <div className="p-space-sm rounded-lg bg-surface flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Currency</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    {activeAccountData.currency}
                  </span>
                </div>
                <span className="material-symbols-outlined text-secondary text-[20px]">public</span>
              </div>

              {/* Custodian Bank */}
              <div className="p-space-sm rounded-lg bg-surface flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Bank</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    {activeAccountData.bank || 'Not provided'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">account_balance</span>
              </div>

              {/* Bank Code */}
              <div className="p-space-sm rounded-lg bg-surface flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Bank Code</span>
                  <span className="font-code-token text-label-md text-on-surface font-semibold">
                    {activeAccountData.bankCode || 'Not provided'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!activeAccountData.bankCode} aria-label="Copy bank code"
                  onClick={(e) => handleCopy(e, activeAccountData.bankCode, 'drawer-bank-code')}
                  className="p-1.5 text-on-surface-variant hover:text-secondary rounded"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedKey === 'drawer-bank-code' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>

            </div>

            <div className="bg-surface-container-low/60 rounded-xl p-space-md text-on-surface-variant font-body-sm text-body-sm flex gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px]">shield</span>
              <span>Only account details supplied by PayBridge are shown. Contact support if you need additional banking instructions.</span>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-space-lg bg-surface-container-low flex flex-col sm:flex-row gap-space-sm">
            <button
              type="button"
              onClick={() => navigate('/statements')}
              className="flex-1 flex items-center justify-center gap-space-xs py-space-xs rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-md text-label-md shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>View Statements</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/transfers')}
              className="flex-1 flex items-center justify-center gap-space-xs py-space-xs rounded-lg bg-primary-container text-on-primary hover:bg-inverse-surface font-label-md text-label-md shadow-sm transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Transfer Funds</span>
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}

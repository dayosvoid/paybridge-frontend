import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccountBalances } from '../api/accounts'
import { getTransfers, type TransferView } from '../api/transfers'
import type { AccountView } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../lib/money'
import { Icon } from '../components/Icon'

type TransactionStatus = 'Successful' | 'Pending' | 'Failed'
type TransactionKind = 'Incoming' | 'Transfer' | 'FX conversion' | 'Remittance'

interface TransactionRow {
  reference: string
  title: string
  date: string
  kind: TransactionKind
  amount: string
  currency: 'NGN' | 'USD'
  status: TransactionStatus
}

function StatusPill({ status }: { status: TransactionStatus }) {
  const style =
    status === 'Successful'
      ? 'bg-teal-50 text-teal-800'
      : status === 'Pending'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-rose-50 text-rose-800'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function AccountStatusPill({
  status,
  loading,
  error,
}: {
  status?: AccountView['status']
  loading: boolean
  error: boolean
}) {
  const label = loading
    ? 'Loading'
    : error
      ? 'Unavailable'
      : status ?? 'Not found'

  const style =
    status === 'ACTIVE' && !loading && !error
      ? 'bg-teal-50 text-teal-800'
      : status === 'SUSPENDED' || status === 'CLOSED'
        ? 'bg-rose-50 text-rose-800'
        : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}
    >
      {label}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const [balances, setBalances] = useState<AccountView[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [balancesError, setBalancesError] = useState('')

  const [transfers, setTransfers] = useState<TransferView[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState('')

  const [hideBalance, setHideBalance] = useState(false)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('All types')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [fxAmount, setFxAmount] = useState('500')
  const [notice, setNotice] = useState('')

  const accountNumber = user?.accountNumber

  useEffect(() => {
    let cancelled = false

    if (!accountNumber) {
      setTransfers([])
      setTransactionsLoading(false)
      setTransactionsError('No account is associated with this customer.')

      setBalances([])
      setBalancesLoading(false)
      setBalancesError('No account is associated with this customer.')
      return
    }

    setTransactionsLoading(true)
    setTransactionsError('')
    setBalancesLoading(true)
    setBalancesError('')

    async function loadDashboardData() {
      const txPromise = getTransfers(accountNumber!, undefined, 0, 20)
        .then((result) => {
          if (!cancelled) {
            setTransfers(result.items)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTransfers([])
            setTransactionsError('Unable to load your transactions.')
          }
        })
        .finally(() => {
          if (!cancelled) {
            setTransactionsLoading(false)
          }
        })

      const balancesPromise = getAccountBalances(accountNumber!)
        .then((result) => {
          if (!cancelled) {
            setBalances(result)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setBalances([])
            setBalancesError('Unable to load your account balances.')
          }
        })
        .finally(() => {
          if (!cancelled) {
            setBalancesLoading(false)
          }
        })

      await Promise.all([txPromise, balancesPromise])
    }

    void loadDashboardData()

    return () => {
      cancelled = true
    }
  }, [accountNumber])

  const ngnAccount = balances.find((account) => account.currency === 'NGN')
  const usdAccount = balances.find((account) => account.currency === 'USD')

  const transactionRows = useMemo<TransactionRow[]>(
    () =>
      transfers.map((transfer) => {
        const incoming = transfer.destinationAccount === accountNumber

        const status: TransactionStatus =
          transfer.status === 'SUCCESS'
            ? 'Successful'
            : transfer.status === 'PENDING'
              ? 'Pending'
              : 'Failed'

        return {
          reference: transfer.reference,
          title: incoming ? 'Incoming transfer' : 'Outgoing transfer',
          date: 'Date unavailable',
          kind: 'Transfer',
          amount: `${incoming ? '+' : '-'}${(
            transfer.amountMinor / 100
          ).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          currency: transfer.currency,
          status,
        }
      }),
    [transfers, accountNumber],
  )

  const filteredTransactions = useMemo(
    () =>
      transactionRows.filter((transaction) => {
        const query = search.toLowerCase()

        const matchesSearch = `${transaction.title} ${transaction.reference} ${transaction.kind}`
          .toLowerCase()
          .includes(query)

        const matchesKind =
          kindFilter === 'All types' || transaction.kind === kindFilter

        const matchesStatus =
          statusFilter === 'All statuses' || transaction.status === statusFilter

        return matchesSearch && matchesKind && matchesStatus
      }),
    [transactionRows, search, kindFilter, statusFilter],
  )

  const parsedFxAmount = Number(fxAmount)
  const estimatedNgn =
    fxAmount.trim() !== '' &&
    Number.isFinite(parsedFxAmount) &&
    parsedFxAmount >= 0
      ? (parsedFxAmount * 1530).toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—'

  async function copyAccountNumber() {
    if (!accountNumber) return

    try {
      await navigator.clipboard.writeText(accountNumber)
      setNotice('Account number copied.')
    } catch {
      setNotice(
        'Could not copy the account number. Please select it and copy manually.',
      )
    }
  }

  function notReady(feature: string) {
    setNotice(
      `${feature} is not connected yet. This dashboard is the UI foundation; we'll wire this action to the backend next.`,
    )
  }

  return (
    <>
      {notice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl flex items-center justify-between gap-3"
        >
          <span>{notice}</span>
          <button
            className="font-bold underline shrink-0"
            onClick={() => setNotice('')}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-4 md:p-8">
          <section
            aria-label="Account balances"
            className="grid grid-cols-1 gap-4 xl:grid-cols-3"
          >
            <div className="relative flex min-h-52 flex-col justify-between overflow-hidden rounded-2xl bg-[#102137] p-6 text-white shadow-sm">
              <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl" />
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Total portfolio value
                  </p>
                  <button
                    aria-label={hideBalance ? 'Show balances' : 'Hide balances'}
                    onClick={() => setHideBalance((value) => !value)}
                    className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Icon
                      name={hideBalance ? 'visibility_off' : 'visibility'}
                    />
                  </button>
                </div>

                <p className="mt-4 text-2xl font-bold tracking-tight">
                  {hideBalance
                    ? '••••••••'
                    : balancesLoading
                      ? 'Loading…'
                      : balancesError
                        ? 'Unavailable'
                        : 'FX rate required'}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  A combined NGN/USD value requires a live backend FX rate.
                  Balances are not added across currencies.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-300">
                <Icon
                  name="database"
                  className="text-base text-teal-300"
                />
                {balancesLoading
                  ? 'Loading account data'
                  : balancesError
                    ? 'Account data unavailable'
                    : 'Account data loaded from PayBridge'}
              </div>
            </div>

            {/* NGN account */}
            <div className="flex min-h-52 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-lg font-bold text-teal-800">
                      ₦
                    </span>
                    <span className="font-semibold text-slate-800">
                      NGN account
                    </span>
                  </div>
                  <AccountStatusPill
                    status={ngnAccount?.status}
                    loading={balancesLoading}
                    error={Boolean(balancesError)}
                  />
                </div>

                <p className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                  {hideBalance
                    ? '••••••'
                    : balancesLoading
                      ? 'Loading…'
                      : balancesError
                        ? 'Unavailable'
                        : ngnAccount
                          ? formatMoney(ngnAccount.balanceMinor, 'NGN')
                          : 'No NGN account'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {balancesError
                    ? balancesError
                    : ngnAccount
                      ? 'Live balance from your PayBridge account.'
                      : balancesLoading
                        ? 'Fetching your account balance.'
                        : 'No NGN balance was returned by the account API.'}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    Account number
                  </p>
                  <p className="truncate font-mono text-sm font-medium text-slate-700">
                    {accountNumber || 'Not assigned'}
                  </p>
                </div>
                {accountNumber && (
                  <button
                    aria-label="Copy account number"
                    onClick={() => void copyAccountNumber()}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                    type="button"
                  >
                    <Icon name="content_copy" />
                  </button>
                )}
              </div>
            </div>

            {/* USD account */}
            <div className="flex min-h-52 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-800">
                      $
                    </span>
                    <span className="font-semibold text-slate-800">
                      USD account
                    </span>
                  </div>
                  <AccountStatusPill
                    status={usdAccount?.status}
                    loading={balancesLoading}
                    error={Boolean(balancesError)}
                  />
                </div>

                <p className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                  {hideBalance
                    ? '••••••'
                    : balancesLoading
                      ? 'Loading…'
                      : balancesError
                        ? 'Unavailable'
                        : usdAccount
                          ? formatMoney(usdAccount.balanceMinor, 'USD')
                          : 'No USD account'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {balancesError
                    ? balancesError
                    : usdAccount
                      ? 'Live balance from your PayBridge account.'
                      : balancesLoading
                        ? 'Fetching your account balance.'
                        : 'No USD balance was returned by the account API.'}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Account number
                </p>
                <p className="mt-1 truncate font-mono text-sm font-medium text-slate-700">
                  {accountNumber || 'Not assigned'}
                </p>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section
            aria-label="Quick actions"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Link
              to="/transfer"
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#102137] text-white">
                <Icon name="north_east" className="text-xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">
                  Send money
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Local or international
                </span>
              </span>
              <Icon
                name="arrow_forward"
                className="text-lg text-slate-300 transition group-hover:text-teal-700"
              />
            </Link>

            <Link
              to="/fx"
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
                <Icon name="currency_exchange" className="text-xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">
                  Convert currency
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Multi-currency vault FX
                </span>
              </span>
              <Icon
                name="arrow_forward"
                className="text-lg text-slate-300 transition group-hover:text-teal-700"
              />
            </Link>

            <Link
              to="/remittances"
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon name="public" className="text-xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">
                  Remittance
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Global payout rails
                </span>
              </span>
              <Icon
                name="arrow_forward"
                className="text-lg text-slate-300 transition group-hover:text-teal-700"
              />
            </Link>

            <Link
              to="/statements"
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon name="description" className="text-xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">
                  Statements
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Export activity reports
                </span>
              </span>
              <Icon
                name="arrow_forward"
                className="text-lg text-slate-300 transition group-hover:text-teal-700"
              />
            </Link>
          </section>

          {/* Main Content Grid: Transactions and FX Widget */}
          <section className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
            {/* Transactions Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 2xl:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent transactions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Live transfer history from your PayBridge ledger.
                  </p>
                </div>
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-800 hover:text-teal-950"
                >
                  View all
                  <Icon name="arrow_forward" className="text-lg" />
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="relative sm:col-span-1">
                  <span className="sr-only">Search transactions</span>
                  <Icon
                    name="search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search transactions…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>

                <select
                  aria-label="Filter by transaction type"
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                >
                  <option>All types</option>
                  <option>Transfer</option>
                </select>

                <select
                  aria-label="Filter by transaction status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                >
                  <option>All statuses</option>
                  <option>Successful</option>
                  <option>Pending</option>
                  <option>Failed</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[610px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pr-3 font-semibold">Transaction</th>
                      <th className="pb-3 pr-3 font-semibold">Date</th>
                      <th className="pb-3 pr-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactionsLoading && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm text-slate-500">
                          Loading transactions...
                        </td>
                      </tr>
                    )}

                    {!transactionsLoading && transactionsError && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm text-rose-700">
                          {transactionsError}
                        </td>
                      </tr>
                    )}

                    {!transactionsLoading &&
                      !transactionsError &&
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.reference}>
                          <td className="py-4 pr-3">
                            <div className="font-semibold text-slate-800">
                              {transaction.title}
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-slate-400">
                              {transaction.reference}
                            </div>
                          </td>
                          <td className="py-4 pr-3 text-sm text-slate-500">
                            {transaction.date}
                          </td>
                          <td
                            className={`py-4 pr-3 text-sm font-semibold ${
                              transaction.amount.startsWith('+')
                                ? 'text-teal-700'
                                : 'text-slate-800'
                            }`}
                          >
                            {transaction.amount} {transaction.currency}
                          </td>
                          <td className="py-4">
                            <StatusPill status={transaction.status} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {!transactionsLoading &&
                  !transactionsError &&
                  filteredTransactions.length === 0 && (
                    <div className="py-12 text-center">
                      <Icon
                        name="search_off"
                        className="text-3xl text-slate-300"
                      />
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        No matching transactions
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try changing your search or filters.
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Sidebar Column: FX Calculator and Account Limits */}
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      FX quote preview
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Illustrative rate only
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <Icon
                      name="currency_exchange"
                      className="text-xl"
                    />
                  </span>
                </div>

                <label className="mt-5 block text-xs font-semibold text-slate-500">
                  You send (USD)
                  <div className="mt-1 flex items-center rounded-xl bg-slate-50 px-3 py-3">
                    <span className="mr-2 text-sm font-bold text-slate-500">
                      $
                    </span>
                    <input
                      inputMode="decimal"
                      value={fxAmount}
                      onChange={(event) => setFxAmount(event.target.value)}
                      aria-label="Illustrative USD amount"
                      className="min-w-0 flex-1 bg-transparent font-mono text-lg font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </label>

                <div className="my-3 flex justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                    <Icon name="south" />
                  </span>
                </div>

                <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Recipient gets (estimated NGN)
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-teal-800">
                    ₦{estimatedNgn}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-500">Example rate</span>
                  <span className="font-mono font-semibold text-slate-700">
                    1 USD ≈ 1,530 NGN
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  This calculator uses a hard-coded demonstration rate. It is
                  not a live quote and does not lock a rate.
                </p>

                <button
                  onClick={() => notReady('Live FX quote')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#102137] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="button"
                >
                  Get a real quote
                  <Icon name="arrow_forward" className="text-lg" />
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon name="shield_person" className="text-xl" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Account & limits
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Details not loaded
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  Verification status and transfer limits will be displayed
                  here when the backend exposes them to the signed-in customer.
                </p>

                <button
                  onClick={() => notReady('Account limits')}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:text-teal-950"
                  type="button"
                >
                  View account settings
                  <Icon name="arrow_forward" className="text-lg" />
                </button>
              </section>
            </div>
          </section>

          <footer className="pb-2 text-center text-xs text-slate-400">
            PayBridge demo dashboard · Sample activity is not financial data.
          </footer>
        </div>
    </>
  )
}
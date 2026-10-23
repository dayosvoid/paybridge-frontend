import { useEffect, useRef, useState } from 'react'
import { getAccountBalances } from '../api/accounts'
import { ApiError, newIdempotencyKey } from '../api/client'
import { createFxQuote, executeFxConversion, getFxConversion, type FxConversion, type FxQuote } from '../api/fx'
import { clearFxAttempt, readFxAttempt, saveFxAttempt, type FxAttempt } from '../api/fxAttempts'
import type { AccountView } from '../api/types'
import { formatMajor, parseMajorToMinor } from '../lib/money'

const terminal = (result: FxConversion) => result.status === 'SUCCESS' || result.status === 'FAILED'
const message = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'

export function useFxConversion(accountNumber: string) {
  const [restored] = useState(() => readFxAttempt(accountNumber))
  const [payAmount, setPayAmount] = useState(restored ? formatMajor(restored.quote.sourceAmountMinor).replace(/,/g, '') : '')
  const [quote, setQuote] = useState<FxQuote | null>(restored?.quote ?? null)
  const [result, setResult] = useState<FxConversion | null>(restored?.result ?? null)
  const [records, setRecords] = useState<FxConversion[]>(restored?.result ? [restored.result] : [])
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [balanceVersion, setBalanceVersion] = useState(0)
  const [balancesLoading, setBalancesLoading] = useState(Boolean(accountNumber))
  const [balancesError, setBalancesError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [uncertain, setUncertain] = useState(Boolean(restored && !restored.result))
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)
  const [confirmed, setConfirmed] = useState(false)
  const attempt = useRef<FxAttempt | null>(restored)
  const quoteSequence = useRef(0)
  const quoteBusy = useRef(false)
  const executeBusy = useRef(false)
  const refreshBusy = useRef(false)
  const mounted = useRef(true)
  const succeeded = useRef(new Set<string>())
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; quoteSequence.current++ } }, [])

  useEffect(() => {
    if (!accountNumber) return
    let cancelled = false
    setBalancesLoading(true)
    setBalancesError('')
    getAccountBalances(accountNumber).then(data => { if (!cancelled) setAccounts(data) }).catch(() => {
      if (!cancelled) { setAccounts([]); setBalancesError('Unable to load currency balances. Please retry.') }
    }).finally(() => { if (!cancelled) setBalancesLoading(false) })
    return () => { cancelled = true }
  }, [accountNumber, balanceVersion])

  useEffect(() => {
    if (!quote) return
    const expires = Date.parse(quote.expiresAt)
    setNow(Date.now())
    if (expires <= Date.now()) return
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= expires) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [quote])

  const sourceAccount = accounts.find(account => account.accountNumber === accountNumber && account.currency === 'NGN')
  const destinationAccount = accounts.find(account => account.accountNumber === accountNumber && account.currency === 'USD')
  const amountMinor = parseMajorToMinor(payAmount)
  const expired = Boolean(quote && Date.parse(quote.expiresAt) <= now)
  const locked = executing || refreshing || uncertain || Boolean(result && !terminal(result))
  const canQuote = Boolean(accountNumber && sourceAccount?.status === 'ACTIVE' && destinationAccount?.status === 'ACTIVE' && !balancesLoading && !balancesError && !locked)

  function changeAmount(value: string) {
    if (locked) return
    quoteSequence.current++
    quoteBusy.current = false
    setPayAmount(value)
    setQuote(null)
    setConfirmed(false)
    setQuoteLoading(false)
    setError('')
    setResult(null)
    attempt.current = null
  }
  function percentage(percent: number) {
    if (!sourceAccount || locked) return
    changeAmount(formatMajor(Number(BigInt(sourceAccount.balanceMinor) * BigInt(percent) / 100n)).replace(/,/g, ''))
  }
  async function requestQuote() {
    if (locked || quoteBusy.current) return
    setError('')
    if (!accountNumber) { setError('No account is associated with this customer.'); return }
    if (!canQuote) { setError('Active NGN and USD accounts are required to convert.'); return }
    if (amountMinor === null) { setError('Enter a positive amount with no more than two decimal places.'); return }
    if (amountMinor > sourceAccount!.balanceMinor) { setError('Insufficient available NGN balance.'); return }
    const sequence = ++quoteSequence.current
    quoteBusy.current = true
    setQuote(null)
    setResult(null)
    setConfirmed(false)
    setQuoteLoading(true)
    attempt.current = null
    try {
      const data = await createFxQuote({ accountNumber, sourceCurrency: 'NGN', destinationCurrency: 'USD', sourceAmountMinor: amountMinor })
      if (!mounted.current || sequence !== quoteSequence.current) return
      if (data.accountNumber !== accountNumber || data.sourceAmountMinor !== amountMinor) throw new Error('The quote does not match your conversion request.')
      setNow(Date.now())
      setQuote(data)
    } catch (error) {
      if (mounted.current && sequence === quoteSequence.current) setError(message(error))
    } finally {
      if (mounted.current && sequence === quoteSequence.current) { quoteBusy.current = false; setQuoteLoading(false) }
    }
  }
  function acceptConversion(data: FxConversion) {
    setResult(data)
    setUncertain(false)
    setRecords(previous => [data, ...previous.filter(record => record.reference !== data.reference)])
    if (terminal(data)) clearFxAttempt(accountNumber)
    else if (attempt.current) { attempt.current = { ...attempt.current, result: data }; saveFxAttempt(attempt.current) }
    if (data.status === 'SUCCESS' && !succeeded.current.has(data.reference)) {
      succeeded.current.add(data.reference)
      setBalanceVersion(version => version + 1)
    }
  }
  async function execute() {
    if (executeBusy.current || result || !quote) return
    setError('')
    if (!uncertain && (!confirmed || Date.parse(quote.expiresAt) <= Date.now())) {
      setNow(Date.now())
      setError(!confirmed ? 'Confirm the quoted amounts before converting.' : 'This quote has expired. Request a new quote and confirm it.'); return
    }
    if (!attempt.current) attempt.current = { quote, key: newIdempotencyKey() }
    if (attempt.current.quote.quoteId !== quote.quoteId) { setError('Request a new quote before converting.'); return }
    executeBusy.current = true
    setExecuting(true)
    saveFxAttempt(attempt.current)
    try {
      const data = await executeFxConversion(quote.quoteId, attempt.current.key)
      if (!mounted.current) return
      if (data.accountNumber !== accountNumber || data.quoteId !== quote.quoteId) throw new Error('The server could not confirm this conversion.')
      acceptConversion(data)
    } catch (error) {
      if (!mounted.current) return
      const unknown = uncertain || !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 409
      setUncertain(unknown)
      setError(message(error) + (unknown ? ' The outcome is unconfirmed. Retry only this same conversion.' : ' Request a new quote and confirm it before trying again.'))
      if (!unknown) { clearFxAttempt(accountNumber); attempt.current = null; setQuote(null); setConfirmed(false) }
    } finally {
      executeBusy.current = false
      if (mounted.current) setExecuting(false)
    }
  }
  async function refreshResult(reference: string) {
    if (refreshBusy.current) return
    refreshBusy.current = true
    setRefreshing(true)
    setError('')
    try {
      const data = await getFxConversion(reference)
      if (!mounted.current) return
      if (data.reference !== reference || data.accountNumber !== accountNumber) throw new Error('The returned conversion does not match this account.')
      if (result?.reference === reference) acceptConversion(data)
      else setRecords(previous => previous.map(record => record.reference === reference ? data : record))
    } catch (error) { if (mounted.current) setError(message(error)) }
    finally { refreshBusy.current = false; if (mounted.current) setRefreshing(false) }
  }
  return { payAmount, changeAmount, percentage, quote, result, records, balancesLoading, balancesError, sourceAccount, destinationAccount,
    quoteLoading, executing, refreshing, uncertain, error, expired, now, locked, canQuote, confirmed, setConfirmed,
    requestQuote, execute, refreshResult, retryBalances: () => setBalanceVersion(version => version + 1) }
}

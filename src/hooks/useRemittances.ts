import { useEffect, useRef, useState } from 'react'
import { getAccountBalances } from '../api/accounts'
import { ApiError, newIdempotencyKey } from '../api/client'
import { getMyRemittances, getRemittance, getRemittanceQuotes, sendRemittance,
  type OutboundRemittancePage, type OutboundRemittanceView, type ProviderQuoteView, type RemittanceRequest } from '../api/remittances'
import { clearRemittanceAttempt, readRemittanceAttempt, saveRemittanceAttempt, type RemittanceAttempt } from '../api/remittanceAttempts'
import type { AccountView } from '../api/types'
import { formatMajor, parseMajorToMinor } from '../lib/money'

const describeError = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'
export function useRemittances(accountNumber: string) {
  const [restored] = useState(() => readRemittanceAttempt(accountNumber))
  const [amount, setAmount] = useState(restored ? formatMajor(restored.quote.sourceAmountMinor).replace(/,/g, '') : '')
  const [offers, setOffers] = useState<ProviderQuoteView[]>(restored ? [restored.quote] : [])
  const [selected, setSelected] = useState<ProviderQuoteView | null>(restored?.quote ?? null)
  const [beneficiaryName, setBeneficiaryName] = useState(restored?.request.beneficiaryName ?? '')
  const [beneficiaryAccount, setBeneficiaryAccount] = useState(restored?.request.beneficiaryAccount ?? '')
  const [beneficiaryBank, setBeneficiaryBank] = useState(restored?.request.beneficiaryBank ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [uncertain, setUncertain] = useState(Boolean(restored))
  const [submission, setSubmission] = useState<OutboundRemittanceView | null>(null)
  const [details, setDetails] = useState<OutboundRemittanceView | null>(null)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [balancesLoading, setBalancesLoading] = useState(Boolean(accountNumber))
  const [balancesError, setBalancesError] = useState('')
  const [balanceVersion, setBalanceVersion] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [historyVersion, setHistoryVersion] = useState(0)
  const historyKey = JSON.stringify([accountNumber, historyPage, historyVersion])
  const [historyState, setHistoryState] = useState<{ key: string; data?: OutboundRemittancePage; error?: string }>({ key: '' })
  const [now, setNow] = useState(Date.now)
  const mounted = useRef(true)
  const quoteSequence = useRef(0)
  const quoteBusy = useRef(false)
  const sendBusy = useRef(false)
  const detailBusy = useRef(false)
  const attempt = useRef<RemittanceAttempt | null>(restored)
  const locked = sending || uncertain || Boolean(submission)
  const ngnAccount = accounts.find(account => account.accountNumber === accountNumber && account.currency === 'NGN')
  const usdAccount = accounts.find(account => account.accountNumber === accountNumber && account.currency === 'USD')
  const canQuote = Boolean(accountNumber && ngnAccount?.status === 'ACTIVE' && !balancesLoading && !balancesError && !locked)
  const history = historyState.key === historyKey ? historyState.data : undefined
  const historyError = historyState.key === historyKey ? historyState.error : undefined
  const historyLoading = Boolean(accountNumber) && (!history || historyState.key !== historyKey) && !historyError
  const expired = Boolean(selected && Date.parse(selected.expiresAt) <= now)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; quoteSequence.current++ } }, [])
  useEffect(() => {
    if (!accountNumber) return
    let cancelled = false
    setBalancesLoading(true)
    setBalancesError('')
    getAccountBalances(accountNumber).then(data => { if (!cancelled) setAccounts(data) }).catch(error => {
      if (!cancelled) { setAccounts([]); setBalancesError('Unable to load account balances. ' + describeError(error)) }
    }).finally(() => { if (!cancelled) setBalancesLoading(false) })
    return () => { cancelled = true }
  }, [accountNumber, balanceVersion])
  useEffect(() => {
    if (!accountNumber) return
    let cancelled = false
    setHistoryState({ key: historyKey })
    getMyRemittances(historyPage, 20).then(data => {
      if (data.items.some(item => item.sourceAccount !== accountNumber)) throw new Error('History does not match the authenticated account.')
      if (!cancelled) setHistoryState({ key: historyKey, data })
    }).catch(error => { if (!cancelled) setHistoryState({ key: historyKey, error: 'Unable to load your remittance history. ' + describeError(error) }) })
    return () => { cancelled = true }
  }, [accountNumber, historyKey, historyPage])
  useEffect(() => {
    if (!offers.length) return
    const deadline = Math.max(...offers.map(offer => Date.parse(offer.expiresAt)))
    setNow(Date.now())
    if (deadline <= Date.now()) return
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= deadline) clearInterval(timer) }, 1000)
    return () => clearInterval(timer)
  }, [offers])

  function changeAmount(value: string) {
    if (locked) return
    quoteSequence.current++
    quoteBusy.current = false
    setAmount(value)
    setOffers([])
    setSelected(null)
    setConfirmed(false)
    setQuoteLoading(false)
    setError('')
    attempt.current = null
  }
  function percentage(percent: number) {
    if (ngnAccount) changeAmount(formatMajor(Number(BigInt(ngnAccount.balanceMinor) * BigInt(percent) / 100n)).replace(/,/g, ''))
  }
  async function requestQuotes() {
    if (quoteBusy.current || locked) return
    setError('')
    const minor = parseMajorToMinor(amount)
    if (!canQuote) { setError('An active NGN account is required.'); return }
    if (minor === null) { setError('Enter a positive NGN amount with no more than two decimal places.'); return }
    if (minor > ngnAccount!.balanceMinor) { setError('Insufficient available NGN balance. Provider fees also apply.'); return }
    const sequence = ++quoteSequence.current
    quoteBusy.current = true
    setQuoteLoading(true)
    setOffers([])
    setSelected(null)
    setConfirmed(false)
    attempt.current = null
    try {
      const data = await getRemittanceQuotes({ sourceAccount: accountNumber, sourceAmountMinor: minor, destinationCurrency: 'USD' })
      if (!mounted.current || sequence !== quoteSequence.current) return
      if (data.some(offer => offer.sourceAccount !== accountNumber || offer.sourceAmountMinor !== minor)) throw new Error('Provider quotes do not match this request.')
      setNow(Date.now())
      setOffers(data)
      if (!data.length) setError('No provider offers are available. Request quotes again later.')
    } catch (error) { if (mounted.current && sequence === quoteSequence.current) setError(describeError(error)) }
    finally { if (mounted.current && sequence === quoteSequence.current) { quoteBusy.current = false; setQuoteLoading(false) } }
  }
  function selectOffer(offer: ProviderQuoteView) {
    if (locked || Date.parse(offer.expiresAt) <= Date.now()) return
    setSelected(offer)
    setConfirmed(false)
    setError('')
    attempt.current = null
  }
  function changeBeneficiary(field: 'name' | 'account' | 'bank', value: string) {
    if (locked) return
    if (field === 'name') setBeneficiaryName(value)
    if (field === 'account') setBeneficiaryAccount(value)
    if (field === 'bank') setBeneficiaryBank(value)
    setConfirmed(false)
    setError('')
    attempt.current = null
  }
  async function submit() {
    if (sendBusy.current || submission || !selected) return
    setError('')
    let request: RemittanceRequest
    if (uncertain && attempt.current) request = attempt.current.request
    else {
      if (Date.parse(selected.expiresAt) <= Date.now()) { setNow(Date.now()); setError('The selected quote has expired. Request new quotes and confirm an offer.'); return }
      if (!beneficiaryName.trim() || !beneficiaryAccount.trim() || !beneficiaryBank.trim()) { setError('Enter the beneficiary name, account, and bank.'); return }
      if (!confirmed) { setError('Confirm the selected offer and beneficiary before submitting.'); return }
      if (!ngnAccount || balancesLoading || balancesError || ngnAccount.status !== 'ACTIVE' || selected.totalDebitMinor > ngnAccount.balanceMinor) {
        setError('Insufficient or unavailable NGN balance for the total debit, including the provider fee.'); return
      }
      request = { quoteId: selected.quoteId, beneficiaryName: beneficiaryName.trim(), beneficiaryAccount: beneficiaryAccount.trim(), beneficiaryBank: beneficiaryBank.trim() }
    }
    if (!attempt.current || JSON.stringify(attempt.current.request) !== JSON.stringify(request)) attempt.current = { quote: selected, request, key: newIdempotencyKey() }
    sendBusy.current = true
    setSending(true)
    saveRemittanceAttempt(attempt.current)
    try {
      const data = await sendRemittance(request, attempt.current.key)
      if (!mounted.current) return
      if (data.sourceAccount !== accountNumber || data.quoteId !== request.quoteId) throw new Error('The server could not confirm this remittance.')
      clearRemittanceAttempt(accountNumber)
      setUncertain(false)
      setSubmission(data)
      setDetails(data)
      setDetailError('')
      setBalanceVersion(value => value + 1)
      setHistoryPage(0)
      setHistoryVersion(value => value + 1)
    } catch (error) {
      if (!mounted.current) return
      const unknown = uncertain || !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 409
      setUncertain(unknown)
      setError(describeError(error) + (unknown ? ' The outcome is unconfirmed. Retry only this same payout.' : ' Review the details and request fresh quotes before confirming again.'))
      if (!unknown) { clearRemittanceAttempt(accountNumber); attempt.current = null; setSelected(null); setOffers([]); setConfirmed(false) }
    } finally { sendBusy.current = false; if (mounted.current) setSending(false) }
  }
  async function refreshDetails(reference: string) {
    if (detailBusy.current) return
    detailBusy.current = true
    setDetailLoading(true)
    setDetailError('')
    try {
      const data = await getRemittance(reference)
      if (!mounted.current) return
      if (data.reference !== reference || data.sourceAccount !== accountNumber) throw new Error('The returned remittance does not match this account.')
      setDetails(data)
      if (submission?.reference === reference) setSubmission(data)
      setBalanceVersion(value => value + 1)
      setHistoryVersion(value => value + 1)
    } catch (error) { if (mounted.current) setDetailError(describeError(error)) }
    finally { detailBusy.current = false; if (mounted.current) setDetailLoading(false) }
  }
  function startAnother() {
    if (!submission || sending || detailBusy.current) return
    setSubmission(null)
    setOffers([])
    setSelected(null)
    setAmount('')
    setConfirmed(false)
    setBeneficiaryName('')
    setBeneficiaryAccount('')
    setBeneficiaryBank('')
    setError('')
    attempt.current = null
  }
  return { amount, offers, selected, beneficiaryName, beneficiaryAccount, beneficiaryBank, confirmed, setConfirmed,
    uncertain, submission, details, error, detailError, quoteLoading, sending, detailLoading, ngnAccount, usdAccount,
    balancesLoading, balancesError, history, historyError, historyLoading, historyPage, now, expired, locked, canQuote,
    changeAmount, percentage, requestQuotes, selectOffer, changeBeneficiary, submit, refreshDetails, startAnother,
    retryBalances: () => setBalanceVersion(value => value + 1), refreshHistory: () => setHistoryVersion(value => value + 1),
    previousPage: () => setHistoryPage(value => Math.max(0, value - 1)), nextPage: () => { if (history?.hasNext) setHistoryPage(value => value + 1) } }
}

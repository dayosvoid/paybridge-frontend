import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountView } from '../api/types'
import type { OutboundRemittanceView, ProviderQuoteView, RemittanceQuoteRequest, RemittanceRequest } from '../api/remittances'
import { clearRemittanceAttempt } from '../api/remittanceAttempts'
import RemittancesPage from './RemittancesPage'

const auth = vi.hoisted(() => ({ accountNumber: '1111111111' as string | null, role: 'CUSTOMER' as 'CUSTOMER' | 'ADMIN' }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { accountNumber: auth.accountNumber, role: auth.role } }) }))
const NOW = Date.parse('2026-10-23T10:00:00Z')
const balances: AccountView[] = ['NGN', 'USD'].map(currency => ({ accountNumber: '1111111111', currency: currency as 'NGN' | 'USD', balanceMinor: currency === 'NGN' ? 10000000 : 12345,
  customerId: 1, status: 'ACTIVE', bankCode: null, bankName: null, accountName: null }))
const offer: ProviderQuoteView = { quoteId: 'QUOTE-ONE', providerId: 'provider-one', providerName: 'Provider One', sourceAccount: '1111111111', sourceAmountMinor: 1000000,
  feeMinor: 1000, totalDebitMinor: 1001000, destinationCurrency: 'USD', destinationAmountMinor: 666, rate: 0.000666, etaMinutes: 30, tags: ['BEST_RATE'], expiresAt: '2026-10-23T10:02:00Z' }
const second: ProviderQuoteView = { ...offer, quoteId: 'QUOTE-TWO', providerId: 'provider-two', providerName: 'Provider Two', feeMinor: 500, totalDebitMinor: 1000500,
  destinationAmountMinor: 650, rate: 0.00065, etaMinutes: 10, tags: ['FASTEST', 'LOWEST_FEE'] }
const record: OutboundRemittanceView = { reference: 'OUT-REAL-1', status: 'PENDING', quoteId: offer.quoteId, providerId: offer.providerId, providerReference: null,
  sourceAccount: offer.sourceAccount, sourceAmountMinor: offer.sourceAmountMinor, feeMinor: offer.feeMinor, destinationCurrency: 'USD', destinationAmountMinor: offer.destinationAmountMinor,
  rate: offer.rate, beneficiaryName: 'Recipient', beneficiaryAccount: '1234567890', beneficiaryBank: 'Recipient Bank', failureReason: null, createdAt: '2026-10-23T10:00:03Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const page = (items: OutboundRemittanceView[] = []) => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0, hasNext: false })
type Payout = { body: RemittanceRequest; key: string }
function installApi(options: {
  balances?: () => Response | Promise<Response>
  quotes?: (request: RemittanceQuoteRequest, index: number) => Response | Promise<Response>
  send?: (request: Payout, index: number) => Response | Promise<Response>
  history?: (url: URL, index: number) => Response | Promise<Response>
  details?: (reference: string) => Response | Promise<Response>
} = {}) {
  const payouts: Payout[] = []
  const quoteRequests: RemittanceQuoteRequest[] = []
  let historyRequests = 0
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname.endsWith('/balances')) return options.balances?.() ?? json(balances)
    if (url.pathname === '/api/outbound-remittances/quotes') {
      const request = JSON.parse(String(init?.body)) as RemittanceQuoteRequest
      quoteRequests.push(request)
      return options.quotes?.(request, quoteRequests.length) ?? json([offer, second].map(o => ({ ...o, sourceAmountMinor: request.sourceAmountMinor, totalDebitMinor: request.sourceAmountMinor + o.feeMinor })), 201)
    }
    if (url.pathname === '/api/outbound-remittances' && init?.method === 'POST') {
      const request = { body: JSON.parse(String(init.body)), key: (init.headers as Record<string, string>)['Idempotency-Key'] }
      payouts.push(request)
      const selected = request.body.quoteId === second.quoteId ? second : offer
      return options.send?.(request, payouts.length) ?? json({ ...record, ...request.body, providerId: selected.providerId, feeMinor: selected.feeMinor, destinationAmountMinor: selected.destinationAmountMinor, rate: selected.rate }, 201)
    }
    if (url.pathname === '/api/outbound-remittances/mine') return options.history?.(url, ++historyRequests) ?? json(page())
    if (url.pathname.startsWith('/api/outbound-remittances/') && !url.pathname.includes('/reconcile')) return options.details?.(decodeURIComponent(url.pathname.split('/').pop()!)) ?? json(record)
    throw new Error('Forbidden or unexpected endpoint: ' + input)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { payouts, quoteRequests, fetchMock }
}
async function ready() {
  const rendered = render(<MemoryRouter><RemittancesPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Compare provider quotes' })).toBeEnabled())
  return rendered
}
async function compare(amount = '10000') {
  fireEvent.change(screen.getByLabelText('Source amount (NGN)'), { target: { value: amount } })
  fireEvent.click(screen.getByRole('button', { name: 'Compare provider quotes' }))
  await screen.findByRole('radio', { name: 'Provider One offer' })
}
function beneficiary(name = ' Recipient ', account = ' 1234567890 ', bank = ' Recipient Bank ') {
  fireEvent.change(screen.getByLabelText('Beneficiary name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Beneficiary account'), { target: { value: account } })
  fireEvent.change(screen.getByLabelText('Beneficiary bank'), { target: { value: bank } })
}
function selectAndConfirm(provider = 'Provider One') {
  fireEvent.click(screen.getByRole('radio', { name: provider + ' offer' }))
  beneficiary()
  fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm the selected offer and beneficiary details.' }))
}
function send() { fireEvent.click(screen.getByRole('button', { name: 'Confirm payout' })) }
beforeEach(() => {
  auth.accountNumber = '1111111111'; auth.role = 'CUSTOMER'; clearRemittanceAttempt('1111111111')
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  let index = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`)
})
afterEach(() => { cleanup(); clearRemittanceAttempt('1111111111'); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('customer remittances', () => {
  it('compares actual provider offers, tags and costs without calculating replacement rates', async () => {
    const { quoteRequests } = installApi()
    await ready(); await compare('0.29')
    expect(quoteRequests).toEqual([{ sourceAccount: '1111111111', sourceAmountMinor: 29, destinationCurrency: 'USD' }])
    expect(screen.getByText('Demo provider quotes')).toBeInTheDocument()
    expect(screen.getByText('₦100,000.00')).toBeInTheDocument()
    expect(screen.getByText('$123.45')).toBeInTheDocument()
    const choices = screen.getAllByRole('radio')
    expect(choices.map(input => input.getAttribute('aria-label'))).toEqual(['Provider One offer', 'Provider Two offer'])
    expect(choices[0]).not.toBeChecked()
    const first = within(choices[0].closest('label')!)
    expect(first.getByText('1 NGN = 0.000666 USD')).toBeInTheDocument()
    expect(first.getByText('₦10.00 NGN')).toBeInTheDocument()
    expect(first.getByText('₦10.29 NGN')).toBeInTheDocument()
    expect(first.getByText('$6.66 USD')).toBeInTheDocument()
    expect(first.getByText('30 minutes')).toBeInTheDocument()
    expect(first.getByText(offer.expiresAt)).toBeInTheDocument()
    expect(screen.getByText('BEST RATE')).toBeInTheDocument()
    expect(screen.getByText('LOWEST FEE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm payout' })).toBeDisabled()
  })

  it('requires selection and confirmation and sends the selected quote with trimmed beneficiary fields', async () => {
    const { payouts } = installApi()
    await ready(); await compare()
    selectAndConfirm('Provider Two')
    send()
    const detail = await screen.findByRole('region', { name: 'Remittance details' })
    expect(await within(detail).findByText('OUT-REAL-1')).toBeInTheDocument()
    expect(within(detail).getByText('PENDING')).toBeInTheDocument()
    expect(within(detail).getByText(/has not been completed/)).toBeInTheDocument()
    expect(payouts[0]).toEqual({ body: { quoteId: 'QUOTE-TWO', beneficiaryName: 'Recipient', beneficiaryAccount: '1234567890', beneficiaryBank: 'Recipient Bank' }, key: expect.any(String) })
  })

  it.each(['0', '-1', '1.001', '1e3', '900719925474099.99'])('rejects invalid amounts %s', async amount => {
    const { quoteRequests } = installApi()
    await ready()
    fireEvent.change(screen.getByLabelText('Source amount (NGN)'), { target: { value: amount } })
    fireEvent.click(screen.getByRole('button', { name: 'Compare provider quotes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a positive NGN amount')
    expect(quoteRequests).toHaveLength(0)
  })

  it.each(['Beneficiary name', 'Beneficiary account', 'Beneficiary bank'])('validates nonblank %s before payout', async label => {
    const { payouts } = installApi()
    await ready(); await compare()
    fireEvent.click(screen.getByRole('radio', { name: 'Provider One offer' }))
    beneficiary()
    fireEvent.change(screen.getByLabelText(label), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('checkbox'))
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the beneficiary name, account, and bank')
    expect(payouts).toHaveLength(0)
  })

  it('clears selection and confirmation when the amount changes', async () => {
    installApi(); await ready(); await compare(); selectAndConfirm()
    fireEvent.change(screen.getByLabelText('Source amount (NGN)'), { target: { value: '20000' } })
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirm payout' })).toBeDisabled()
  })

  it('clears confirmation when another offer or beneficiary is chosen', async () => {
    installApi(); await ready(); await compare(); selectAndConfirm()
    fireEvent.click(screen.getByRole('radio', { name: 'Provider Two offer' }))
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Beneficiary account'), { target: { value: '9876543210' } })
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('disables expired quotes and checks expiration again at submission', async () => {
    const { payouts } = installApi()
    await ready(); await compare(); selectAndConfirm()
    vi.mocked(Date.now).mockReturnValue(NOW + 121000)
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent('selected quote has expired')
    expect(payouts).toHaveLength(0)
    expect(screen.getByRole('radio', { name: 'Provider One offer' })).toBeDisabled()
  })

  it('prevents repeated submissions while waiting for a response', async () => {
    let resolve!: (response: Response) => void
    const { payouts } = installApi({ send: () => new Promise<Response>(r => { resolve = r }) })
    await ready(); await compare(); selectAndConfirm()
    const button = screen.getByRole('button', { name: 'Confirm payout' })
    act(() => { fireEvent.click(button); fireEvent.click(button) })
    expect(payouts).toHaveLength(1)
    expect(screen.getByLabelText('Beneficiary bank')).toBeDisabled()
    await act(async () => { resolve(json(record, 201)) })
    expect(payouts).toHaveLength(1)
  })

  it.each(['network', 'server'])('uses the same request and key for an uncertain %s retry', async kind => {
    const { payouts, quoteRequests } = installApi({ send: (_, index) => {
      if (index === 1) { if (kind === 'network') throw new TypeError('Lost response'); return json({ message: 'Gateway timeout' }, 504) }
      return json(record, 201)
    } })
    await ready(); await compare(); selectAndConfirm(); send()
    const retry = await screen.findByRole('button', { name: 'Retry same payout' })
    expect(screen.getByRole('button', { name: 'Compare provider quotes' })).toBeDisabled()
    vi.mocked(Date.now).mockReturnValue(NOW + 121000)
    fireEvent.click(retry)
    expect(await within(screen.getByRole('region', { name: 'Remittance details' })).findByText(record.reference)).toBeInTheDocument()
    expect(payouts).toHaveLength(2)
    expect(payouts[1]).toEqual(payouts[0])
    expect(quoteRequests).toHaveLength(1)
  })

  it('restores only retry state across remounts and obtains history from the backend', async () => {
    const { payouts, fetchMock } = installApi({ send: (_, index) => index === 1 ? Promise.reject(new TypeError('Lost response')) : json(record, 201) })
    await ready(); await compare(); selectAndConfirm(); send()
    await screen.findByRole('button', { name: 'Retry same payout' })
    cleanup()
    render(<MemoryRouter><RemittancesPage /></MemoryRouter>)
    expect(payouts).toHaveLength(1)
    expect(await screen.findByText('No remittances found.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/outbound-remittances/mine?page=0&size=20')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Retry same payout' }))
    await within(screen.getByRole('region', { name: 'Remittance details' })).findByText(record.reference)
    expect(payouts[1]).toEqual(payouts[0])
  })

  it('uses a new key for a genuinely new payout after explicit confirmation', async () => {
    const { payouts } = installApi({
      quotes: (request, index) => json([offer, second].map(value => ({ ...value, quoteId: value.quoteId + '-' + index, sourceAmountMinor: request.sourceAmountMinor, totalDebitMinor: request.sourceAmountMinor + value.feeMinor }))),
      send: (request, index) => json({ ...record, ...request.body, reference: 'OUT-' + index }, 201),
    })
    await ready(); await compare(); selectAndConfirm(); send()
    fireEvent.click(await screen.findByRole('button', { name: 'Start another remittance' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compare provider quotes' })).toBeEnabled())
    await compare(); selectAndConfirm(); send()
    await waitFor(() => expect(payouts).toHaveLength(2))
    expect(payouts[1].key).not.toBe(payouts[0].key)
    expect(payouts[1].body.quoteId).not.toBe(payouts[0].body.quoteId)
  })

  it('refreshes backend balances and customer history after a PENDING payout without simulated deductions', async () => {
    let balanceCalls = 0
    const { fetchMock } = installApi({ balances: () => json(++balanceCalls === 1 ? balances : balances.map(a => a.currency === 'NGN' ? { ...a, balanceMinor: 250000 } : a)), history: (_, index) => json(page(index === 1 ? [] : [record])) })
    await ready(); await compare(); selectAndConfirm(); send()
    expect(await screen.findByText('₦2,500.00')).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Customer remittance history' })
    expect(await within(history).findByText(record.reference)).toBeInTheDocument()
    expect(balanceCalls).toBe(2)
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/outbound-remittances/mine?page=0&size=20')).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([url, init]) => url === '/api/outbound-remittances' && init?.method !== 'POST')).toBe(false)
    expect(fetchMock.mock.calls.some(([url]) => /reconcile|webhook/.test(url))).toBe(false)
  })

  it('paginates /mine without account or customer filters and preserves backend order', async () => {
    const { fetchMock } = installApi({ history: url => {
      const index = Number(url.searchParams.get('page'))
      return json({ items: index === 0 ? [{ ...record, reference: 'BACKEND-FIRST', createdAt: '2026-10-20T00:00:00Z' }, { ...record, reference: 'BACKEND-SECOND' }] : [{ ...record, reference: 'PAGE-TWO' }], page: index, size: 20, totalItems: 21, totalPages: 2, hasNext: index === 0 })
    } })
    await ready()
    const history = screen.getByRole('region', { name: 'Customer remittance history' })
    await within(history).findByText('BACKEND-FIRST')
    const rows = within(history).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('BACKEND-FIRST')
    expect(rows[2]).toHaveTextContent('BACKEND-SECOND')
    fireEvent.click(within(history).getByRole('button', { name: 'Next page' }))
    await within(history).findByText('PAGE-TWO')
    expect(within(history).getByRole('button', { name: 'Next page' })).toBeDisabled()
    fireEvent.click(within(history).getByRole('button', { name: 'Previous page' }))
    await within(history).findByText('BACKEND-FIRST')
    const urls = fetchMock.mock.calls.map(([url]) => url).filter(url => url.includes('/mine'))
    expect(urls).toEqual(['/api/outbound-remittances/mine?page=0&size=20', '/api/outbound-remittances/mine?page=1&size=20', '/api/outbound-remittances/mine?page=0&size=20'])
  })

  it('shows empty customer history', async () => {
    installApi(); await ready()
    expect(await screen.findByText('No remittances found.')).toBeInTheDocument()
  })

  it.each([401, 403, 404, 503])('handles history HTTP %s errors and explicit retry without admin fallback', async status => {
    const { fetchMock } = installApi({ history: (_, index) => index === 1 ? json({ message: 'Customer history unavailable' }, status) : json(page([record])) })
    await ready()
    const history = screen.getByRole('region', { name: 'Customer remittance history' })
    expect(await within(history).findByRole('alert')).toHaveTextContent('Customer history unavailable')
    fireEvent.click(within(history).getByRole('button', { name: 'Retry history' }))
    expect(await within(history).findByText(record.reference)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/outbound-remittances')).toBe(false)
  })

  it.each(['PENDING', 'COMPLETED', 'FAILED', 'RETURNED'] as const)('retrieves and displays %s distinctly with backend details', async status => {
    const { fetchMock } = installApi({ history: () => json(page([record])), details: () => json({ ...record, status, providerReference: 'PROVIDER-REF', failureReason: status === 'FAILED' || status === 'RETURNED' ? 'Provider reason' : null }) })
    await ready()
    const history = screen.getByRole('region', { name: 'Customer remittance history' })
    fireEvent.click(await within(history).findByRole('button', { name: 'View remittance ' + record.reference }))
    const detail = screen.getByRole('region', { name: 'Remittance details' })
    expect(await within(detail).findByText(status)).toBeInTheDocument()
    expect(within(detail).getByText('PROVIDER-REF')).toBeInTheDocument()
    expect(within(detail).getByText(record.createdAt)).toBeInTheDocument()
    if (status === 'FAILED' || status === 'RETURNED') expect(within(detail).getByText('Reason: Provider reason')).toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('button', { name: 'Refresh remittance status' }))
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === '/api/outbound-remittances/OUT-REAL-1')).toHaveLength(2))
    expect(fetchMock.mock.calls.some(([url]) => /reconcile|webhook/.test(url))).toBe(false)
  })

  it('preserves known payout details when a status refresh fails', async () => {
    installApi({ details: () => json({ message: 'Status unavailable' }, 503) })
    await ready(); await compare(); selectAndConfirm(); send()
    const detail = screen.getByRole('region', { name: 'Remittance details' })
    fireEvent.click(await within(detail).findByRole('button', { name: 'Refresh remittance status' }))
    expect(await within(detail).findByRole('alert')).toHaveTextContent('Status unavailable')
    expect(within(detail).getByText('PENDING')).toBeInTheDocument()
  })

  it('rejects a total debit greater than the actual funding balance', async () => {
    const { payouts } = installApi({ balances: () => json([{ ...balances[0], balanceMinor: 1000000 }]) })
    await ready(); await compare(); selectAndConfirm(); send()
    expect(await screen.findByRole('alert')).toHaveTextContent('including the provider fee')
    expect(payouts).toHaveLength(0)
  })

  it('handles quote API authorization failures without submitting', async () => {
    const { payouts } = installApi({ quotes: () => json({ message: 'Account access denied' }, 403) })
    await ready()
    fireEvent.change(screen.getByLabelText('Source amount (NGN)'), { target: { value: '10000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Compare provider quotes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Account access denied')
    expect(payouts).toHaveLength(0)
  })

  it('handles invalid payout quotes without automatically creating another offer', async () => {
    const { quoteRequests, payouts } = installApi({ send: () => json({ message: 'Quote expired' }, 400) })
    await ready(); await compare(); selectAndConfirm(); send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Quote expired')
    expect(quoteRequests).toHaveLength(1)
    expect(payouts).toHaveLength(1)
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('preserves the payout response when its balance refresh fails', async () => {
    let calls = 0
    installApi({ balances: () => ++calls === 1 ? json(balances) : json({ message: 'Balance service unavailable' }, 503) })
    await ready(); await compare(); selectAndConfirm(); send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load account balances')
    expect(within(screen.getByRole('region', { name: 'Remittance details' })).getByText('PENDING')).toBeInTheDocument()
  })

  it('does not make requests without an account or expose customer operations to an admin', () => {
    const { fetchMock } = installApi()
    auth.accountNumber = null
    const page = render(<MemoryRouter><RemittancesPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('No account is associated')
    expect(fetchMock).not.toHaveBeenCalled()
    auth.role = 'ADMIN'
    page.rerender(<MemoryRouter><RemittancesPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('customers only')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

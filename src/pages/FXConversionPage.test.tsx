import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountView } from '../api/types'
import type { FxConversion, FxQuote, FxQuoteRequest } from '../api/fx'
import { clearFxAttempt } from '../api/fxAttempts'
import FXConversionPage from './FXConversionPage'

const auth = vi.hoisted(() => ({ accountNumber: '1111111111' as string | null }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { accountNumber: auth.accountNumber } }) }))
const NOW = Date.parse('2026-10-23T10:00:00Z')
const accounts: AccountView[] = ['NGN', 'USD'].map(currency => ({ accountNumber: '1111111111', currency: currency as 'NGN' | 'USD',
  balanceMinor: currency === 'NGN' ? 10000000 : 12345, customerId: 1, status: 'ACTIVE', bankCode: null, bankName: null, accountName: null }))
const quote: FxQuote = { quoteId: 'QUOTE-1', accountNumber: '1111111111', sourceCurrency: 'NGN', destinationCurrency: 'USD',
  sourceAmountMinor: 1000000, destinationAmountMinor: 654, rate: '0.000654', rateType: 'DEMO_CONFIGURED', expiresAt: '2026-10-23T10:02:00Z' }
const conversion: FxConversion = { reference: 'FX-REAL-1', status: 'SUCCESS', quoteId: quote.quoteId, accountNumber: quote.accountNumber,
  sourceCurrency: 'NGN', destinationCurrency: 'USD', sourceAmountMinor: quote.sourceAmountMinor, destinationAmountMinor: 654,
  rate: quote.rate, rateType: quote.rateType, failureReason: null, createdAt: '2026-10-23T10:00:03Z' }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }) }
type Execution = { body: { quoteId: string }; key: string }
function installApi(options: {
  balances?: () => Response | Promise<Response>
  quote?: (request: FxQuoteRequest, index: number) => Response | Promise<Response>
  execute?: (request: Execution, index: number) => Response | Promise<Response>
  retrieve?: () => Response | Promise<Response>
} = {}) {
  const executions: Execution[] = []
  const quotes: FxQuoteRequest[] = []
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.endsWith('/balances')) return options.balances?.() ?? json(accounts)
    if (input === '/api/fx/conversions/quotes') {
      const request = JSON.parse(String(init?.body)) as FxQuoteRequest
      quotes.push(request)
      return options.quote?.(request, quotes.length) ?? json({ ...quote, ...request, quoteId: 'QUOTE-' + quotes.length }, 201)
    }
    if (input === '/api/fx/conversions' && init?.method === 'POST') {
      const request = { body: JSON.parse(String(init.body)), key: (init.headers as Record<string, string>)['Idempotency-Key'] }
      executions.push(request)
      return options.execute?.(request, executions.length) ?? json({ ...conversion, ...request.body }, 201)
    }
    if (input.startsWith('/api/fx/conversions/')) return options.retrieve?.() ?? json(conversion)
    throw new Error('Unexpected endpoint: ' + input)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, executions, quotes }
}
async function ready() {
  const page = render(<MemoryRouter><FXConversionPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Request quote' })).toBeEnabled())
  return page
}
async function requestQuote(amount = '10000') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: amount } })
  fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
  await screen.findByRole('checkbox', { name: 'I confirm the quoted amounts and rate.' })
}
function confirm() {
  fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm the quoted amounts and rate.' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm conversion' }))
}
beforeEach(() => {
  auth.accountNumber = '1111111111'
  clearFxAttempt('1111111111')
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  let index = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`)
})
afterEach(() => { cleanup(); clearFxAttempt('1111111111'); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('stored FX quotes and conversions', () => {
  it('uses actual balances and creates an executable stored quote with exact minor units', async () => {
    const { quotes, fetchMock } = installApi()
    await ready()
    expect(screen.getByText('₦100,000.00 NGN')).toBeInTheDocument()
    expect(screen.getByText(/Balance: \$123.45/)).toBeInTheDocument()
    await requestQuote('0.29')
    expect(quotes).toEqual([{ accountNumber: '1111111111', sourceCurrency: 'NGN', destinationCurrency: 'USD', sourceAmountMinor: 29 }])
    const details = screen.getByRole('region', { name: 'Stored quote' })
    expect(within(details).getByText('₦0.29 NGN')).toBeInTheDocument()
    expect(within(details).getByText('$6.54 USD')).toBeInTheDocument()
    expect(within(details).getByText('1 NGN = 0.000654 USD')).toBeInTheDocument()
    expect(within(details).getByText('Configured demo rate (DEMO_CONFIGURED)')).toBeInTheDocument()
    expect(within(details).getByText(quote.expiresAt)).toBeInTheDocument()
    expect(within(details).getByText('120s remaining')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Quoted destination amount' })).toHaveValue('6.54')
    expect(fetchMock.mock.calls.some(([url]) => url.startsWith('/api/fx/quote'))).toBe(false)
    expect(screen.getByRole('button', { name: 'Reverse Currency Pair' })).toBeDisabled()
  })

  it.each(['0', '-1', '0.001', '1e4', '900719925474099.99'])('rejects invalid source amount %s', async amount => {
    const { quotes } = installApi()
    await ready()
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: amount } })
    fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a positive amount')
    expect(quotes).toHaveLength(0)
  })

  it('uses integer percentage shortcuts and rejects insufficient balances', async () => {
    const { quotes } = installApi()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: '25%' }))
    expect(screen.getByRole('textbox', { name: 'Source amount' })).toHaveValue('25000.00')
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: '100000.01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Insufficient available NGN balance')
    expect(quotes).toHaveLength(0)
  })

  it('invalidates the quote and confirmation immediately when the amount changes', async () => {
    installApi()
    await ready(); await requestQuote()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: '20000' } })
    expect(screen.queryByText('QUOTE-1')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Confirm conversion' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Quoted destination amount' })).toHaveValue('—')
  })

  it('ignores a stale quote response after the amount changes', async () => {
    let resolve!: (response: Response) => void
    installApi({ quote: () => new Promise<Response>(r => { resolve = r }) })
    await ready()
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: '10000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: '20000' } })
    await act(async () => { resolve(json(quote)) })
    expect(screen.queryByText('QUOTE-1')).toBeNull()
  })

  it('requires explicit confirmation and refreshes balances only after SUCCESS', async () => {
    let balanceRequests = 0
    const { executions } = installApi({ balances: () => json(++balanceRequests === 1 ? accounts : accounts.map(account => ({ ...account, balanceMinor: 100 }))) })
    await ready(); await requestQuote()
    expect(screen.getByRole('button', { name: 'Confirm conversion' })).toBeDisabled()
    expect(executions).toHaveLength(0)
    confirm()
    const result = await screen.findByRole('region', { name: 'Conversion result' })
    expect(within(result).getByText('SUCCESS')).toBeInTheDocument()
    expect(within(result).getByText('FX-REAL-1')).toBeInTheDocument()
    expect(within(result).getByText(/₦10,000.00 NGN → \$6.54 USD/)).toBeInTheDocument()
    expect(executions[0]).toEqual({ body: { quoteId: 'QUOTE-1' }, key: expect.any(String) })
    expect(await screen.findByText('₦1.00 NGN')).toBeInTheDocument()
    expect(balanceRequests).toBe(2)
    expect(within(result).getByText(conversion.createdAt)).toBeInTheDocument()
  })

  it('prevents duplicate confirmation clicks while conversion is in progress', async () => {
    let resolve!: (response: Response) => void
    const { executions } = installApi({ execute: () => new Promise<Response>(r => { resolve = r }) })
    await ready(); await requestQuote()
    fireEvent.click(screen.getByRole('checkbox'))
    const button = screen.getByRole('button', { name: 'Confirm conversion' })
    act(() => { fireEvent.click(button); fireEvent.click(button) })
    expect(executions).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Source amount' })).toBeDisabled()
    await act(async () => { resolve(json(conversion, 201)) })
    expect(executions).toHaveLength(1)
  })

  it('disables expired quotes without restarting the server expiration countdown', async () => {
    const { executions } = installApi({ quote: () => json({ ...quote, expiresAt: '2026-10-23T09:59:59Z' }) })
    await ready(); await requestQuote()
    expect(screen.getByText('Quote expired')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm conversion' })).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(executions).toHaveLength(0)
  })

  it('checks expiration again at confirmation even if the display timer has not ticked', async () => {
    const { executions } = installApi()
    await ready(); await requestQuote()
    fireEvent.click(screen.getByRole('checkbox'))
    vi.mocked(Date.now).mockReturnValue(NOW + 121000)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm conversion' }))
    expect(screen.getByRole('alert')).toHaveTextContent('This quote has expired')
    expect(executions).toHaveLength(0)
  })

  it.each(['network', 'server'])('retries an uncertain %s outcome with the same quote and key', async kind => {
    const { executions, quotes } = installApi({ execute: (_, index) => {
      if (index === 1) { if (kind === 'network') throw new TypeError('Lost response'); return json({ message: 'Gateway timeout' }, 504) }
      return json(conversion, 201)
    } })
    await ready(); await requestQuote(); confirm()
    const retry = await screen.findByRole('button', { name: 'Retry same conversion' })
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeDisabled()
    vi.mocked(Date.now).mockReturnValue(NOW + 121000)
    fireEvent.click(retry)
    expect(await screen.findByRole('region', { name: 'Conversion result' })).toBeInTheDocument()
    expect(executions).toHaveLength(2)
    expect(executions[1]).toEqual(executions[0])
    expect(quotes).toHaveLength(1)
  })

  it('restores an unresolved attempt across remounts without automatic execution', async () => {
    const { executions } = installApi({ execute: (_, index) => index === 1 ? Promise.reject(new TypeError('Lost response')) : json(conversion) })
    await ready(); await requestQuote(); confirm()
    await screen.findByRole('button', { name: 'Retry same conversion' })
    cleanup()
    render(<MemoryRouter><FXConversionPage /></MemoryRouter>)
    expect(executions).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Retry same conversion' }))
    await screen.findByRole('region', { name: 'Conversion result' })
    expect(executions[1]).toEqual(executions[0])
    expect(sessionStorage.getItem('paybridge.fxAttempt.1111111111')).toBeNull()
  })

  it('creates a new key for another quote and requires a new confirmation', async () => {
    const { executions } = installApi({ execute: request => json({ ...conversion, quoteId: request.body.quoteId, reference: 'RESULT-' + request.body.quoteId }) })
    await ready(); await requestQuote(); confirm()
    await screen.findByRole('region', { name: 'Conversion result' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Request quote' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
    await screen.findByText('QUOTE-2')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Confirm conversion' })).toBeDisabled()
    confirm()
    await screen.findByRole('region', { name: 'Conversion result' })
    expect(executions[1].body).toEqual({ quoteId: 'QUOTE-2' })
    expect(executions[1].key).not.toBe(executions[0].key)
  })

  it.each(['PENDING', 'UNRECOGNIZED'])('does not treat a 201 %s result as completed and retrieves its actual status', async status => {
    let balances = 0
    const { fetchMock } = installApi({ execute: () => json({ ...conversion, status }, 201), balances: () => { balances++; return json(accounts) } })
    await ready(); await requestQuote(); confirm()
    const result = await screen.findByRole('region', { name: 'Conversion result' })
    expect(within(result).getByText(status)).toBeInTheDocument()
    expect(balances).toBe(1)
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh conversion status' }))
    expect(await within(result).findByText('SUCCESS')).toBeInTheDocument()
    await waitFor(() => expect(balances).toBe(2))
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/fx/conversions/FX-REAL-1')).toHaveLength(1)
  })

  it('shows failed conversion reasons without refreshing balances or inventing history', async () => {
    let balances = 0
    installApi({ execute: () => json({ ...conversion, status: 'FAILED', failureReason: 'Insufficient funds' }, 201), balances: () => { balances++; return json(accounts) } })
    await ready()
    expect(screen.getByText('No conversion records are available in this session.')).toBeInTheDocument()
    await requestQuote(); confirm()
    const result = await screen.findByRole('region', { name: 'Conversion result' })
    expect(within(result).getByText('Insufficient funds')).toBeInTheDocument()
    expect(balances).toBe(1)
    const table = within(screen.getByRole('region', { name: 'Conversion records' })).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByText(conversion.createdAt)).toBeInTheDocument()
    expect(screen.queryByText(/6 Executed|28 historical|PB-FX-992014|1,530|Guaranteed Zero/)).toBeNull()
  })

  it.each([400, 404, 410, 422])('invalidates rejected quotes after HTTP %s without auto-requoting', async status => {
    const { quotes, executions } = installApi({ execute: () => json({ message: 'Quote expired or invalid' }, status) })
    await ready(); await requestQuote(); confirm()
    expect(await screen.findByRole('alert')).toHaveTextContent('Quote expired or invalid')
    expect(screen.queryByText('QUOTE-1')).toBeNull()
    expect(executions).toHaveLength(1)
    expect(quotes).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeEnabled()
  })

  it('handles a consumed-quote conflict conservatively without creating or executing another quote', async () => {
    const { quotes, executions } = installApi({ execute: () => json({ message: 'Quote already consumed' }, 409) })
    await ready(); await requestQuote(); confirm()
    expect(await screen.findByRole('alert')).toHaveTextContent('Quote already consumed')
    expect(screen.getByRole('button', { name: 'Retry same conversion' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeDisabled()
    expect(quotes).toHaveLength(1)
    expect(executions).toHaveLength(1)
  })

  it('shows quote failures and permits an explicit retry without executing', async () => {
    const { executions } = installApi({ quote: () => json({ message: 'Rate unavailable' }, 503) })
    await ready()
    fireEvent.change(screen.getByRole('textbox', { name: 'Source amount' }), { target: { value: '10000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Request quote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Rate unavailable')
    expect(executions).toHaveLength(0)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('preserves a successful record even if the balance refresh fails', async () => {
    let balances = 0
    installApi({ balances: () => ++balances === 1 ? json(accounts) : json({ message: 'Unavailable' }, 503) })
    await ready(); await requestQuote(); confirm()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load currency balances')
    expect(within(screen.getByRole('region', { name: 'Conversion result' })).getByText('SUCCESS')).toBeInTheDocument()
  })

  it('does not make authenticated requests when the account number is missing', () => {
    auth.accountNumber = null
    const { fetchMock } = installApi()
    render(<MemoryRouter><FXConversionPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('No account is associated')
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires active accounts in both currencies', async () => {
    installApi({ balances: () => json([accounts[0], { ...accounts[1], status: 'SUSPENDED' }]) })
    render(<MemoryRouter><FXConversionPage /></MemoryRouter>)
    expect(await screen.findByText('Active NGN and USD accounts are required to convert.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request quote' })).toBeDisabled()
  })
})

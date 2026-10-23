import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountView } from '../api/types'
import type { TransferRequest, TransferView } from '../api/transfers'
import TransferPage from './TransferPage'
import { clearTransferAttempt } from '../api/transferAttempts'

const auth = vi.hoisted(() => ({ accountNumber: '1111111111' as string | null }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { accountNumber: auth.accountNumber } }) }))
const balances: AccountView[] = ['NGN', 'USD'].map(currency => ({
  accountNumber: '1111111111', currency: currency as 'NGN' | 'USD', balanceMinor: 10000000,
  customerId: 1, status: 'ACTIVE', bankCode: null, bankName: null, accountName: null,
}))
const transfer: TransferView = {
  reference: 'PB-RESULT', status: 'SUCCESS', sourceAccount: '1111111111', destinationAccount: '9999999999',
  currency: 'NGN', amountMinor: 1234, feeMinor: 0, taxMinor: 0, failureReason: null,
}
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }) }
type Post = { body: TransferRequest; key: string }
function installApi(options: {
  create?: (post: Post, index: number) => Response | Promise<Response>
  accountBalances?: () => Response | Promise<Response>
  refresh?: () => Response | Promise<Response>
  history?: (url: URL) => Response | Promise<Response>
  resolve?: (url: URL) => Response | Promise<Response>
} = {}) {
  const posts: Post[] = []
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/kyc/account-details') return options.resolve?.(url) ?? json({ accountNumber: url.searchParams.get('accountNumber'), accountName: 'Returned Recipient', bankName: 'Returned Bank' })
    if (url.pathname.endsWith('/balances')) return options.accountBalances?.() ?? json(balances)
    if (url.pathname === '/api/transfers' && init?.method === 'POST') {
      const post = { body: JSON.parse(String(init.body)), key: (init.headers as Record<string, string>)['Idempotency-Key'] }
      posts.push(post)
      return options.create?.(post, posts.length) ?? json({ ...transfer, ...post.body }, 201)
    }
    if (url.pathname.startsWith('/api/transfers/')) return options.refresh?.() ?? json(transfer)
    if (url.pathname === '/api/transfers') return options.history?.(url) ?? json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0, hasNext: false })
    throw new Error('Unexpected request: ' + input)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { posts, fetchMock }
}
async function renderReady() {
  render(<MemoryRouter><TransferPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Use NGN account' })).toBeEnabled())
}
function fill(amount = '12.34', destination = '9999999999') {
  fireEvent.change(screen.getByLabelText('Recipient account number'), { target: { value: destination } })
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } })
}
function send() { fireEvent.click(screen.getByRole('button', { name: /Send .* Now/ })) }
beforeEach(() => {
  auth.accountNumber = '1111111111'
  clearTransferAttempt('1111111111')
  let key = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++key).padStart(12, '0')}`)
})
afterEach(() => { cleanup(); clearTransferAttempt('1111111111'); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Transfer API integration', () => {
  it('sends an internal transfer with the authenticated source and exact minor units', async () => {
    const { posts } = installApi()
    await renderReady()
    fill('0.29')
    send()
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('SUCCESS')
    expect(posts).toEqual([{ body: { sourceAccount: '1111111111', destinationAccount: '9999999999', amountMinor: 29, currency: 'NGN', bankCode: null }, key: expect.any(String) }])
    expect(posts[0].key).not.toBe('')
    expect(screen.getByRole('heading', { name: '₦0.29' })).toBeInTheDocument()
    expect(screen.getByText('PB-RESULT')).toBeInTheDocument()
    expect(screen.queryByText(/Timestamp|Chioma|test accounts|Select saved contact/)).toBeNull()
  })

  it('requires an external bank code and submits USD with the exact supplied bank code', async () => {
    const { posts } = installApi({ create: post => json({ ...transfer, ...post.body, feeMinor: 25, taxMinor: 10 }, 201) })
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: 'Use USD account' }))
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    fill()
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the recipient bank code')
    expect(posts).toHaveLength(0)
    fireEvent.change(screen.getByLabelText('Bank Code'), { target: { value: ' 007800 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resolve account' }))
    await screen.findByText('Account holder: Returned Recipient')
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the resolved recipient/ }))
    send()
    expect(await screen.findByRole('heading', { name: '$12.34' })).toBeInTheDocument()
    expect(posts[0].body).toMatchObject({ currency: 'USD', amountMinor: 1234, bankCode: '007800' })
    expect(screen.getByText('$0.25')).toBeInTheDocument()
    expect(screen.getByText('$0.10')).toBeInTheDocument()
  })

  it('shows the required Bank Code input only for external transfers', async () => {
    installApi()
    await renderReady()
    expect(screen.queryByRole('textbox', { name: 'Bank Code' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    const bankCode = screen.getByRole('textbox', { name: 'Bank Code' })
    expect(bankCode).toBeVisible()
    expect(bankCode).toBeRequired()
    expect(bankCode).toHaveAttribute('type', 'text')
    expect(screen.getByRole('group', { name: 'Destination bank' })).toBeVisible()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'internal' } })
    expect(screen.queryByRole('textbox', { name: 'Bank Code' })).toBeNull()
  })

  it.each(['', '   '])('rejects a nonfilled external bank code (%j) before creating a transfer', async code => {
    const { posts } = installApi()
    await renderReady()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    fill()
    const bankCode = screen.getByLabelText('Bank Code')
    fireEvent.change(bankCode, { target: { value: code } })
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the recipient bank code')
    expect(bankCode).toHaveAttribute('aria-invalid', 'true')
    expect(posts).toHaveLength(0)
  })

  it('sends bankCode null when switching to internal after entering an external bank code', async () => {
    const { posts } = installApi()
    await renderReady()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    fireEvent.change(screen.getByLabelText('Bank Code'), { target: { value: '007800' } })
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'internal' } })
    expect(screen.queryByLabelText('Bank Code')).toBeNull()
    fill(); send()
    await screen.findByText('PB-RESULT')
    expect(posts[0].body.bankCode).toBeNull()
  })

  it('clears external bank validation when switching to internal', async () => {
    const { posts } = installApi()
    await renderReady()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    fill(); send()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the recipient bank code')
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'internal' } })
    expect(screen.queryByRole('alert')).toBeNull()
    send()
    await screen.findByText('PB-RESULT')
    expect(posts[0].body.bankCode).toBeNull()
  })

  it.each(['0', '-1', '0.001', '1e3', '900719925474099.99'])('rejects invalid amount %s', async amount => {
    const { posts } = installApi()
    await renderReady()
    fill(amount)
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a positive amount')
    expect(posts).toHaveLength(0)
  })

  it('validates destination, self transfer and insufficient balance', async () => {
    const { posts } = installApi()
    await renderReady()
    fill('12.34', ' ')
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a recipient account number')
    fill('12.34', '1111111111')
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('own PayBridge account')
    fill('100000.01')
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('Insufficient available balance')
    expect(posts).toHaveLength(0)
  })

  it('converts grouped major amounts and integer percentage shortcuts', async () => {
    const { posts } = installApi()
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: '25%' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('25000.00')
    fill('1,234.56')
    send()
    await screen.findByText('PB-RESULT')
    expect(posts[0].body.amountMinor).toBe(123456)
  })

  it.each(['network', 'server'])('retains the same key and request on an uncertain %s outcome', async kind => {
    const { posts } = installApi({ create: (post, index) => {
      if (index === 1) {
        if (kind === 'network') throw new TypeError('Failed to fetch')
        return json({ message: 'Gateway timeout' }, 504)
      }
      return json({ ...transfer, ...post.body }, 201)
    } })
    await renderReady()
    fill()
    send()
    const retry = await screen.findByRole('button', { name: /Retry same transfer/ })
    expect(screen.getByLabelText('Amount')).toBeDisabled()
    expect(screen.getByLabelText('Recipient account number')).toBeDisabled()
    expect(screen.getByText(/The outcome is unknown/)).toBeInTheDocument()
    fireEvent.click(retry)
    expect(await screen.findByText('PB-RESULT')).toBeInTheDocument()
    expect(posts).toHaveLength(2)
    expect(posts[1]).toEqual(posts[0])
  })

  it('does not submit again automatically or accept duplicate clicks while a request is pending', async () => {
    let resolve!: (response: Response) => void
    const { posts } = installApi({ create: () => new Promise<Response>(r => { resolve = r }) })
    await renderReady()
    fill()
    const button = screen.getByRole('button', { name: /Send .* Now/ })
    act(() => { fireEvent.click(button); fireEvent.click(button) })
    expect(posts).toHaveLength(1)
    expect(button).toBeDisabled()
    expect(screen.getByLabelText('Transfer type')).toBeDisabled()
    await act(async () => { resolve(json(transfer, 201)) })
    expect(posts).toHaveLength(1)
  })

  it('restores an uncertain attempt on remount and retries with the original key despite changed balances', async () => {
    const { posts } = installApi({ create: (post, index) => index === 1 ? Promise.reject(new TypeError('Lost response')) : json({ ...transfer, ...post.body }, 201) })
    await renderReady(); fill(); send()
    await screen.findByRole('button', { name: /Retry same transfer/ })
    const stored = JSON.parse(sessionStorage.getItem('paybridge.transferAttempt.1111111111')!)
    expect(stored.key).toBe(posts[0].key)
    cleanup()
    // The first attempt may already have debited the account. Idempotent replay
    // must remain possible even when the new balance is lower than the amount.
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/balances')) return json(balances.map(account => ({ ...account, balanceMinor: 0 })))
      if (init?.method === 'POST') {
        const post = { body: JSON.parse(String(init.body)), key: (init.headers as Record<string, string>)['Idempotency-Key'] }
        posts.push(post)
        return json({ ...transfer, ...post.body }, 201)
      }
      return json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0, hasNext: false })
    }))
    render(<MemoryRouter><TransferPage /></MemoryRouter>)
    expect(posts).toHaveLength(1)
    expect(screen.getByLabelText('Amount')).toHaveValue('12.34')
    fireEvent.click(screen.getByRole('button', { name: /Retry same transfer/ }))
    await screen.findByText('PB-RESULT')
    expect(posts[1]).toEqual(posts[0])
    expect(sessionStorage.getItem('paybridge.transferAttempt.1111111111')).toBeNull()
  })

  it('restores a confirmed pending result without creating another transfer', async () => {
    const { posts } = installApi({ create: () => json({ ...transfer, status: 'PENDING' }, 201) })
    await renderReady(); fill(); send()
    await screen.findByText('Transfer pending')
    cleanup()
    render(<MemoryRouter><TransferPage /></MemoryRouter>)
    expect(screen.getByText('Transfer pending')).toBeInTheDocument()
    expect(posts).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Status' }))
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('SUCCESS')
    expect(posts).toHaveLength(1)
  })

  it('keeps a transfer result when the subsequent balance refresh fails', async () => {
    let balanceRequests = 0
    installApi({ accountBalances: () => ++balanceRequests === 1 ? json(balances) : json({ message: 'Unavailable' }, 503) })
    await renderReady(); fill(); send()
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('SUCCESS')
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load account balances')
    expect(screen.getByText('PB-RESULT')).toBeInTheDocument()
  })

  it('handles history failures without disabling the transfer form', async () => {
    let requests = 0
    installApi({ history: () => ++requests === 1 ? json({ message: 'Unavailable' }, 503) : json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0, hasNext: false }) })
    await renderReady()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load transfer history')
    expect(screen.getByRole('button', { name: /Send .* Now/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }))
    expect(await screen.findByText('No transfers found.')).toBeInTheDocument()
  })

  it('uses a new key for an explicitly new transfer, even with the same parameters', async () => {
    const { posts } = installApi()
    await renderReady()
    fill()
    send()
    fireEvent.click(await screen.findByRole('button', { name: 'New Transfer' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Use NGN account' })).toBeEnabled())
    fill()
    send()
    await screen.findByText('PB-RESULT')
    expect(posts).toHaveLength(2)
    expect(posts[1].body).toEqual(posts[0].body)
    expect(posts[1].key).not.toBe(posts[0].key)
  })

  it('shows API validation errors and uses a new key if request parameters change', async () => {
    const { posts } = installApi({ create: (post, index) => index === 1 ? json({ message: 'Destination rejected' }, 400) : json({ ...transfer, ...post.body }, 201) })
    await renderReady()
    fill()
    send()
    expect(await screen.findByRole('alert')).toHaveTextContent('Destination rejected')
    fill('15.00', '8888888888')
    send()
    await screen.findByText('PB-RESULT')
    expect(posts[1].key).not.toBe(posts[0].key)
    expect(posts[1].body.destinationAccount).toBe('8888888888')
  })

  it('treats HTTP 201 PENDING as unconfirmed and refreshes status explicitly', async () => {
    const { posts, fetchMock } = installApi({ create: () => json({ ...transfer, status: 'PENDING' }, 201) })
    await renderReady()
    fill()
    send()
    expect(await screen.findByText('Transfer pending')).toBeInTheDocument()
    expect(screen.getByText(/provider has not yet confirmed/)).toBeInTheDocument()
    expect(screen.getByText('PB-RESULT')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/transfers/PB-RESULT')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Status' }))
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('SUCCESS')
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/transfers/PB-RESULT')).toHaveLength(1)
    expect(posts).toHaveLength(1)
  })

  it('retains a pending result if status refresh fails and permits another explicit check', async () => {
    let checks = 0
    installApi({ create: () => json({ ...transfer, status: 'PENDING' }, 201), refresh: () => ++checks === 1 ? json({ message: 'Provider unavailable' }, 503) : json(transfer) })
    await renderReady()
    fill(); send()
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh Status' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable')
    expect(screen.getByText('Transfer pending')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Status' }))
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('SUCCESS')
  })

  it('shows failed transfer reasons and uses the returned amount and currency in the receipt', async () => {
    installApi({ create: () => json({ ...transfer, status: 'FAILED', amountMinor: 4000, currency: 'USD', feeMinor: 30, taxMinor: 2, failureReason: 'Recipient unavailable' }, 201) })
    await renderReady(); fill(); send()
    expect(await screen.findByText('Transfer status:')).toHaveTextContent('FAILED')
    expect(screen.getByText('Reason: Recipient unavailable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '$40.00' })).toBeInTheDocument()
    expect(screen.getByText('$0.30')).toBeInTheDocument()
    expect(screen.getByText('$0.02')).toBeInTheDocument()
  })

  it('uses a neutral state for unknown statuses rather than treating SUCCESSFUL as success', async () => {
    installApi({ create: () => json({ ...transfer, status: 'SUCCESSFUL' }, 201) })
    await renderReady(); fill(); send()
    expect(await screen.findByText('The final outcome is not confirmed. Refresh the status before starting a new transfer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Transfer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Refresh Status' })).toBeEnabled()
  })

  it('does not request balances, history, or transfers without an authenticated source', () => {
    auth.accountNumber = null
    const { fetchMock } = installApi()
    render(<MemoryRouter><TransferPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('No account is associated')
    expect(screen.getByRole('button', { name: /Send .* Now/ })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('only enables available active currencies and selects USD when NGN is unavailable', async () => {
    installApi({ accountBalances: () => json([{ ...balances[0], status: 'SUSPENDED' }, balances[1]]) })
    render(<MemoryRouter><TransferPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Use USD account' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Use NGN account' })).toBeDisabled()
  })

  it('paginates real transfer history and resets to page zero when filtering status', async () => {
    const { fetchMock } = installApi({ history: url => {
      const page = Number(url.searchParams.get('page'))
      return json({ items: [{ ...transfer, reference: 'HISTORY-' + page, status: url.searchParams.get('status') || 'SUCCESS' }], page, size: 20, totalItems: 21, totalPages: 2, hasNext: page === 0 })
    } })
    await renderReady()
    const history = screen.getByRole('region', { name: 'Transfer history' })
    expect(await within(history).findByText('HISTORY-0')).toBeInTheDocument()
    fireEvent.click(within(history).getByRole('button', { name: 'Next page' }))
    expect(await within(history).findByText('HISTORY-1')).toBeInTheDocument()
    expect(within(history).getByRole('button', { name: 'Next page' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Transfer history status'), { target: { value: 'PENDING' } })
    expect(await within(history).findByText('HISTORY-0')).toBeInTheDocument()
    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls).toContain('/api/transfers?account=1111111111&page=1&size=20')
    expect(urls).toContain('/api/transfers?account=1111111111&page=0&size=20&status=PENDING')
    expect(within(history).getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(within(history).queryByText(/Date|Timestamp/)).toBeNull()
  })
})

describe('External recipient bank account resolution', () => {
  async function externalReady() {
    await renderReady()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'external' } })
    fill()
    fireEvent.change(screen.getByLabelText('Bank Code'), { target: { value: '007800' } })
  }
  function resolve() { fireEvent.click(screen.getByRole('button', { name: 'Resolve account' })) }
  function confirmRecipient() { fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the resolved recipient/ })) }

  it('uses the exact authenticated backend query and requires review before transfer confirmation', async () => {
    const { fetchMock, posts } = installApi()
    await externalReady()
    send()
    expect(screen.getByRole('alert')).toHaveTextContent('Resolve the recipient')
    expect(posts).toHaveLength(0)
    resolve()
    await screen.findByText('Account holder: Returned Recipient')
    expect(screen.getByText('Bank: Returned Bank')).toBeInTheDocument()
    expect(screen.getByText('Resolved bank: Returned Bank')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([path]) => path.includes('/kyc/account-details'))!
    const url = new URL(call[0], 'http://localhost')
    expect(url.searchParams.get('accountNumber')).toBe('9999999999')
    expect(url.searchParams.get('bankCode')).toBe('007800')
    expect(call[1]?.method).toBe('GET')
    send()
    expect(posts).toHaveLength(0)
    confirmRecipient(); send()
    await screen.findByText('PB-RESULT')
    expect(posts[0].body).toEqual({ sourceAccount: '1111111111', destinationAccount: '9999999999', bankCode: '007800', amountMinor: 1234, currency: 'NGN' })
    expect(Object.keys(posts[0].body)).not.toContain('accountName')
  })

  it('shows loading and prevents duplicate lookups', async () => {
    let finish!: (value: Response) => void
    const { fetchMock } = installApi({ resolve: () => new Promise<Response>(resolve => { finish = resolve }) })
    await externalReady(); resolve()
    expect(screen.getByText('Resolving recipient bank account…')).toBeInTheDocument()
    const resolving = screen.getByRole('button', { name: 'Resolving account…' })
    expect(resolving).toBeDisabled()
    fireEvent.click(resolving)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/kyc/account-details'))).toHaveLength(1)
    await act(async () => { finish(json({ accountNumber: '9999999999', accountName: 'Recipient Result', bankName: 'Bank Result' })) })
    expect(screen.getByText('Account holder: Recipient Result')).toBeInTheDocument()
  })

  it.each(['123', '12345678901', 'abcdefghij'])('requires exactly ten account digits: %s', value => {
    // Browser-triggered lookup must not call the backend for malformed details.
    installApi()
    return externalReady().then(() => {
      fireEvent.change(screen.getByLabelText('Recipient account number'), { target: { value } })
      expect(screen.getByRole('button', { name: 'Resolve account' })).toBeDisabled()
      expect(screen.queryByRole('checkbox')).toBeNull()
    })
  })

  it.each([
    [400, { error: 'Unsupported bank code' }, 'Unsupported bank code'],
    [422, { error: 'InvalidAccount', message: 'Account details not found' }, 'Account details not found'],
    [502, { message: 'Provider unavailable' }, 'Bank provider lookup is unavailable'],
    [401, { message: 'Unauthorized' }, 'not authorized'],
    [403, { message: 'Forbidden' }, 'not authorized'],
  ])('handles HTTP %s without verifying or submitting', async (status, body, message) => {
    const { posts } = installApi({ resolve: () => json(body, status as number) })
    await externalReady(); resolve()
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string)
    expect(screen.queryByRole('checkbox')).toBeNull()
    send(); expect(posts).toHaveLength(0)
  })

  it('handles network failures and permits explicit lookup retry', async () => {
    let fail = true
    installApi({ resolve: url => {
      if (fail) throw new TypeError('offline')
      return json({ accountNumber: url.searchParams.get('accountNumber'), accountName: 'Recovered Recipient', bankName: 'Recovered Bank' })
    } })
    await externalReady(); resolve()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    fail = false; resolve()
    expect(await screen.findByText('Account holder: Recovered Recipient')).toBeInTheDocument()
  })

  it.each(['Bank Code', 'Recipient account number'])('clears details and confirmation when %s changes, including changes back', async label => {
    const { posts } = installApi()
    await externalReady(); resolve()
    await screen.findByText('Account holder: Returned Recipient'); confirmRecipient()
    const original = label === 'Bank Code' ? '007800' : '9999999999'
    fireEvent.change(screen.getByLabelText(label), { target: { value: label === 'Bank Code' ? '008800' : '8888888888' } })
    expect(screen.queryByText('Account holder: Returned Recipient')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    fireEvent.change(screen.getByLabelText(label), { target: { value: original } })
    expect(screen.queryByText('Account holder: Returned Recipient')).toBeNull()
    send(); expect(posts).toHaveLength(0)
    resolve(); await screen.findByText('Account holder: Returned Recipient')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('ignores stale lookup responses after another bank is resolved', async () => {
    let first!: (response: Response) => void
    installApi({ resolve: url => url.searchParams.get('bankCode') === '007800' ? new Promise<Response>(resolve => { first = resolve })
      : json({ accountNumber: '9999999999', accountName: 'New Recipient', bankName: 'New Bank' }) })
    await externalReady(); resolve()
    fireEvent.change(screen.getByLabelText('Bank Code'), { target: { value: '008800' } })
    resolve(); await screen.findByText('Account holder: New Recipient')
    await act(async () => { first(json({ accountNumber: '9999999999', accountName: 'Stale Recipient', bankName: 'Old Bank' })) })
    expect(screen.queryByText('Account holder: Stale Recipient')).toBeNull()
    expect(screen.getByText('Account holder: New Recipient')).toBeInTheDocument()
  })

  it('ignores stale failures after account edits and does not restore external results after switching type', async () => {
    let fail!: (response: Response) => void
    const { posts } = installApi({ resolve: () => new Promise<Response>(resolve => { fail = resolve }) })
    await externalReady(); resolve()
    fireEvent.change(screen.getByLabelText('Transfer type'), { target: { value: 'internal' } })
    await act(async () => { fail(json({ error: 'Old provider failure' }, 400)) })
    expect(screen.queryByText(/Old provider failure/)).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recipient bank account resolution' })).toBeNull()
    send(); await screen.findByText('PB-RESULT')
    expect(posts[0].body.bankCode).toBeNull()
  })

  it.each([
    { accountNumber: '0000000000', accountName: 'Wrong account', bankName: 'Returned Bank' },
    { accountNumber: '9999999999', accountName: '', bankName: 'Returned Bank' },
  ])('rejects incomplete or mismatched returned details', async result => {
    installApi({ resolve: () => json(result) })
    await externalReady(); resolve()
    expect(await screen.findByRole('alert')).toHaveTextContent('incomplete or mismatched')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('labels known backend demo placeholders and prevents verified-recipient confirmation', async () => {
    const { posts } = installApi({ resolve: () => json({ accountNumber: '9999999999', accountName: 'FAKE ACCOUNT HOLDER', bankName: 'FAKE BANK (007800)' }) })
    await externalReady(); resolve()
    expect(await screen.findByRole('alert')).toHaveTextContent('backend returned demo account details')
    expect(screen.queryByRole('checkbox')).toBeNull()
    send(); expect(posts).toHaveLength(0)
  })

  it('preserves safe retries of an uncertain external transfer without performing a fresh lookup', async () => {
    let attempts = 0
    const { posts, fetchMock } = installApi({ create: post => ++attempts === 1 ? json({ message: 'Unknown outcome' }, 503) : json({ ...transfer, ...post.body }, 201) })
    await externalReady(); resolve(); await screen.findByText('Account holder: Returned Recipient'); confirmRecipient(); send()
    await screen.findByRole('button', { name: /Retry same transfer/ })
    cleanup()
    render(<MemoryRouter><TransferPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Retry same transfer/ }))
    await screen.findByText('PB-RESULT')
    expect(posts).toHaveLength(2)
    expect(posts[1]).toEqual(posts[0])
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/kyc/account-details'))).toHaveLength(1)
  })
})

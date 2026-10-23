import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountView } from '../api/types'
import AccountsPage from './AccountsPage'

const auth = vi.hoisted(() => ({ accountNumber: '0123456789' as string | null }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { accountNumber: auth.accountNumber } }) }))

const accounts: AccountView[] = [
  { accountNumber: '0123456789', currency: 'NGN', balanceMinor: 1234567, customerId: 12, status: 'ACTIVE', bankCode: '001234', bankName: 'Returned NGN Bank', accountName: 'NGN Customer' },
  { accountNumber: '0123456789', currency: 'USD', balanceMinor: 5, customerId: 12, status: 'SUSPENDED', bankCode: '009876', bankName: 'Returned USD Bank', accountName: 'USD Customer' },
]
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }) }
function renderPage() { return render(<MemoryRouter><AccountsPage /></MemoryRouter>) }
beforeEach(() => { auth.accountNumber = '0123456789' })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Accounts API integration', () => {
  it('loads both currencies for the authenticated account and formats minor units', async () => {
    const fetchMock = vi.fn(async () => response(accounts))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading account balances' })).toBeInTheDocument()
    const ngn = await screen.findByRole('region', { name: 'NGN wallet' })
    const usd = screen.getByRole('region', { name: 'USD wallet' })
    expect(fetchMock).toHaveBeenCalledWith('/api/accounts/0123456789/balances', expect.objectContaining({ method: 'GET' }))
    expect(within(ngn).getByText('₦12,345.67')).toBeInTheDocument()
    expect(within(usd).getByText('$0.05')).toBeInTheDocument()
    expect(within(ngn).getByText('NGN Customer')).toBeInTheDocument()
    expect(within(usd).getByText('Returned USD Bank')).toBeInTheDocument()
    expect(within(usd).getByText('SUSPENDED')).toBeInTheDocument()
    expect(screen.queryByText(/Simulate:|Estimated Portfolio|FDIC|Fedwire|Tier 1 Verified/)).toBeNull()
    expect(screen.getByRole('button', { name: 'All Accounts (2)' })).toBeInTheDocument()
  })

  it.each([null, ''])('handles a missing account number (%s) without an API request', accountNumber => {
    auth.accountNumber = accountNumber
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('No account is associated with this customer.')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /View Account Details/ })).toBeDisabled()
  })

  it('shows an API error and retries the real request', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ message: 'Unavailable' }, 503)).mockImplementation(async () => response(accounts))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load account balances')
    expect(screen.queryByRole('region')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }))
    expect(await screen.findByText('₦12,345.67')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('handles an empty account list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([])))
    renderPage()
    expect(await screen.findByText('No accounts are available.')).toBeInTheDocument()
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByRole('button', { name: /View Account Details/ })).toBeDisabled()
  })

  it('shows a single USD wallet, zero balance, and an empty NGN filter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([{ ...accounts[1], balanceMinor: 0 }])))
    renderPage()
    expect(await screen.findByText('$0.00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View Account Details/ }))
    expect(screen.getByRole('dialog', { name: 'USD Wallet' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close account details' }))
    fireEvent.click(screen.getByRole('button', { name: 'NGN (0)' }))
    expect(screen.getByText('No NGN account is available.')).toBeInTheDocument()
  })

  it('preserves masking, copying, currency filters, and the details drawer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(accounts)))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderPage()
    const ngn = await screen.findByRole('region', { name: 'NGN wallet' })
    expect(within(ngn).queryByText('0123456789')).toBeNull()
    fireEvent.click(within(ngn).getByTitle('Reveal/Mask number'))
    expect(within(ngn).getByText('0123456789')).toBeInTheDocument()
    fireEvent.click(within(ngn).getByTitle('Copy Account Number'))
    expect(writeText).toHaveBeenCalledWith('0123456789')
    expect(await screen.findByText('Copied to clipboard.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide balances' }))
    expect(screen.queryByText('₦12,345.67')).toBeNull()
    expect(screen.queryByText('$0.05')).toBeNull()
    fireEvent.click(within(ngn).getByRole('button', { name: /View Full Details/ }))
    const drawer = screen.getByRole('dialog', { name: 'NGN Wallet' })
    expect(within(drawer).getByText('NGN Customer')).toBeInTheDocument()
    expect(within(drawer).getByText('001234')).toBeInTheDocument()
    expect(within(drawer).queryByText('₦12,345.67')).toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Copy bank code' }))
    expect(writeText).toHaveBeenCalledWith('001234')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'USD (1)' }))
    expect(screen.queryByRole('region', { name: 'NGN wallet' })).toBeNull()
    expect(screen.getByRole('region', { name: 'USD wallet' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show balances' }))
    expect(screen.getByText('$0.05')).toBeInTheDocument()
  })

  it('does not invent nullable bank details and reports clipboard failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([{ ...accounts[0], accountName: null, bankName: null, bankCode: null, balanceMinor: -1 }])))
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    renderPage()
    expect(await screen.findByText('-₦0.01')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View Account Details/ }))
    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getAllByText('Not provided')).toHaveLength(3)
    expect(within(drawer).getByRole('button', { name: 'Copy bank code' })).toBeDisabled()
    expect(within(drawer).getByRole('button', { name: 'Copy account name' })).toBeDisabled()
    expect(within(drawer).queryByText(/IBAN|Sort|Routing|Deposit Tag|Settlement Enabled/)).toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Copy account number' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy')
  })

  it('discards responses for a previous authenticated account', async () => {
    let resolveOld!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve }))
      .mockImplementation(async () => response([{ ...accounts[0], accountNumber: '9876543210', accountName: 'New Account' }])))
    const page = renderPage()
    auth.accountNumber = '9876543210'
    page.rerender(<MemoryRouter><AccountsPage /></MemoryRouter>)
    expect(await screen.findByText('New Account')).toBeInTheDocument()
    await act(async () => { resolveOld(response(accounts)) })
    await waitFor(() => expect(screen.queryByText('NGN Customer')).toBeNull())
    expect(screen.getByText('New Account')).toBeInTheDocument()
  })
})

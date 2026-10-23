import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setRefreshHandler, setTokenProvider } from '../api/client'
import type { LedgerEntryView, StatementPage } from '../api/statements'
import { formatMoney } from '../lib/money'
import TransactionsPage from './TransactionsPage'

const auth = vi.hoisted(() => ({ accountNumber: '0123456789' as string | null }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { accountNumber: auth.accountNumber } }) }))
const entry: LedgerEntryView = { id: 1, type: 'DEBIT', kind: 'TRANSFER', amountMinor: 12345, currency: 'NGN', reference: 'FX-posting', transferReference: 'not-a-transfer', createdAt: '2026-10-01T12:00:00Z', balanceAfterMinor: null }
function statement(overrides: Partial<StatementPage> = {}): StatementPage { return { accountNumber: '0123456789', currency: 'NGN', currentBalanceMinor: 98765, items: [entry], page: 0, size: 20, totalItems: 1, totalPages: 1, hasNext: false, ...overrides } }
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }) }
function renderPage() { return render(<MemoryRouter><TransactionsPage /></MemoryRouter>) }
function requestUrl(mock: ReturnType<typeof vi.fn>) { return new URL(String(mock.mock.calls.at(-1)?.[0]), 'http://localhost') }
async function loaded() { return screen.findByRole('table') }
beforeEach(() => { auth.accountNumber = '0123456789'; setRefreshHandler(null); setTokenProvider(() => 'customer-token') })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); setTokenProvider(() => null); setRefreshHandler(null) })

describe('Ledger statement integration', () => {
  it('loads the authenticated account, positive minor units and actual current balance', async () => {
    const fetchMock = vi.fn(async (_input: string, _options?: RequestInit) => response(statement()))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading ledger statement')
    const table = await loaded()
    expect(requestUrl(fetchMock).pathname).toBe('/api/accounts/0123456789/transactions')
    expect(requestUrl(fetchMock).searchParams.get('currency')).toBe('NGN')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer customer-token' }) }))
    expect(within(table).getByText(formatMoney(12345, 'NGN'))).toBeInTheDocument()
    expect(within(table).getByText('DEBIT')).toBeInTheDocument()
    expect(screen.getByText(formatMoney(98765, 'NGN'))).toBeInTheDocument()
    expect(within(table).getByText('Not supplied')).toBeInTheDocument()
    expect(table.querySelector('time')).toHaveAttribute('datetime', entry.createdAt)
    expect(screen.queryByText(/Successful|Pending|Chioma|Official Receipt/)).toBeNull()
  })

  it('switches currency without mixing entries or balances', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const currency = new URL(input, 'http://localhost').searchParams.get('currency') as 'NGN' | 'USD'
      return response(statement({ currency, currentBalanceMinor: 5, items: [{ ...entry, currency, amountMinor: 1 }] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage(); await loaded()
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USD' } })
    expect(screen.queryByRole('table')).toBeNull()
    expect(await screen.findByText('$0.01')).toBeInTheDocument()
    expect(screen.getByText('$0.05')).toBeInTheDocument()
    expect(requestUrl(fetchMock).searchParams.get('currency')).toBe('USD')
    expect(screen.queryByText(formatMoney(5, 'NGN'))).toBeNull()
  })

  it.each(['DEBIT', 'CREDIT', ''])('uses backend direction filtering: %s', async type => {
    const fetchMock = vi.fn(async (_input: string, _options?: RequestInit) => response(statement()))
    vi.stubGlobal('fetch', fetchMock)
    renderPage(); await loaded()
    fireEvent.change(screen.getByLabelText('Direction'), { target: { value: 'DEBIT' } }); await loaded()
    if (type !== 'DEBIT') { fireEvent.change(screen.getByLabelText('Direction'), { target: { value: type } }); await loaded() }
    expect(requestUrl(fetchMock).searchParams.get('type')).toBe(type || null)
    expect(requestUrl(fetchMock).searchParams.get('page')).toBe('0')
  })

  it('sends local date bounds as ISO instants and blocks reversed ranges', async () => {
    const fetchMock = vi.fn(async (_input: string, _options?: RequestInit) => response(statement()))
    vi.stubGlobal('fetch', fetchMock)
    renderPage(); await loaded()
    fireEvent.change(screen.getByLabelText('From (local time)'), { target: { value: '2026-10-01T09:00:00' } }); await loaded()
    fireEvent.change(screen.getByLabelText('To (local time)'), { target: { value: '2026-10-02T10:00:00' } }); await loaded()
    expect(requestUrl(fetchMock).searchParams.get('from')).toBe(new Date('2026-10-01T09:00:00').toISOString())
    expect(requestUrl(fetchMock).searchParams.get('to')).toBe(new Date('2026-10-02T10:00:00').toISOString())
    const count = fetchMock.mock.calls.length
    fireEvent.change(screen.getByLabelText('To (local time)'), { target: { value: '2026-09-01T10:00:00' } })
    expect(screen.getByRole('alert')).toHaveTextContent('start date')
    expect(fetchMock).toHaveBeenCalledTimes(count)
    expect(screen.queryByRole('table')).toBeNull()
    fireEvent.click(screen.getByText('Clear filters')); await loaded()
    expect(requestUrl(fetchMock).searchParams.has('from')).toBe(false)
    expect(requestUrl(fetchMock).searchParams.has('to')).toBe(false)
  })

  it.each(['Currency', 'Direction', 'From (local time)', 'To (local time)'])('paginates and resets the page when %s changes', async label => {
    const fetchMock = vi.fn(async (input: string) => {
      const params = new URL(input, 'http://localhost').searchParams
      const page = Number(params.get('page'))
      return response(statement({ page, currency: params.get('currency') as 'NGN' | 'USD', items: [], totalItems: 41, totalPages: 3, hasNext: page < 2 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage(); await loaded()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); await loaded()
    expect(requestUrl(fetchMock).searchParams.get('page')).toBe('1')
    expect(requestUrl(fetchMock).searchParams.get('size')).toBe('20')
    fireEvent.click(screen.getByRole('button', { name: 'Previous' })); await loaded()
    expect(requestUrl(fetchMock).searchParams.get('page')).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); await loaded()
    fireEvent.change(screen.getByLabelText(label), { target: { value: label === 'Currency' ? 'USD' : label === 'Direction' ? 'CREDIT' : '2026-10-01T12:00:00' } }); await loaded()
    expect(requestUrl(fetchMock).searchParams.get('page')).toBe('0')
  })

  it('preserves shared references, backend order, and FX/remittance postings without transfer links', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(statement({ items: [{ ...entry, id: 8, reference: 'REM-reference' }, { ...entry, id: 7, kind: 'FEE', reference: 'REM-reference', balanceAfterMinor: 0 }, { ...entry, id: 6 }], totalItems: 3 }))))
    renderPage()
    const table = await loaded()
    expect(within(table).getAllByText('REM-reference')).toHaveLength(2)
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getAllByRole('button').map(node => node.getAttribute('aria-label'))).toEqual(['View posting 8', 'View posting 7', 'View posting 6'])
    expect(table.querySelector('a')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View posting 8' }))
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('not-a-transfer')).toBeInTheDocument()
    expect(within(dialog).queryByText('Balance after')).toBeNull()
    expect(dialog.querySelector('a')).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'View posting 7' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Balance after')).toBeInTheDocument()
    expect(within(dialog).getByText(formatMoney(0, 'NGN'))).toBeInTheDocument()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy posting reference' }))
    expect(writeText).toHaveBeenCalledWith('REM-reference')
    expect(await screen.findByText('Posting reference copied.')).toBeInTheDocument()
  })

  it('supports empty statements and disables the final-page button', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(statement({ items: [], totalItems: 0, totalPages: 0 }))))
    renderPage(); await loaded()
    expect(screen.getByRole('status')).toHaveTextContent('No ledger entries')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it.each([null, '', '   '])('does not request statements without an account: %s', account => {
    auth.accountNumber = account
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('No account')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([401, 403, 503])('handles HTTP %s and retries without fabricated data', async status => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ message: 'Access unavailable' }, status)).mockResolvedValueOnce(response(statement()))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Access unavailable')
    expect(screen.queryByRole('table')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await loaded()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects unsafe monetary integers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(statement({ currentBalanceMinor: Number.MAX_SAFE_INTEGER + 1 }))))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or unsupported')
  })

  it('ignores late responses after a currency switch', async () => {
    let resolveFirst!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveFirst = resolve })).mockResolvedValueOnce(response(statement({ currency: 'USD', items: [{ ...entry, currency: 'USD' }] })))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USD' } }); await loaded()
    await act(async () => { resolveFirst(response(statement())) })
    expect(screen.getByRole('table', { name: 'USD ledger statement' })).toBeInTheDocument()
  })

  it('isolates statements when authenticated account changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: string, _options?: RequestInit) => response(statement())))
    const view = renderPage(); await loaded()
    auth.accountNumber = null
    view.rerender(<MemoryRouter><TransactionsPage /></MemoryRouter>)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('No account')
  })
})


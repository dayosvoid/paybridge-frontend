import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccountStatement, type LedgerEntryView, type StatementPage, type StatementQuery } from '../api/statements'
import type { Currency } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../lib/money'

const control = 'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface'
const button = 'px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-label-md disabled:opacity-40'
const timestamp = (value: string) => new Date(value).toLocaleString(undefined, { timeZoneName: 'short' })

export default function TransactionsPage() {
  const { user } = useAuth()
  const accountNumber = user?.accountNumber?.trim() ?? ''
  return <StatementWorkspace key={accountNumber} accountNumber={accountNumber} />
}

function StatementWorkspace({ accountNumber }: { accountNumber: string }) {
  const [filters, setFilters] = useState({ currency: 'NGN' as Currency, type: '', from: '', to: '', page: 0 })
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: StatementPage; error?: string }>()
  const [selected, setSelected] = useState<LedgerEntryView | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  const from = filters.from ? new Date(filters.from).toISOString() : undefined
  const to = filters.to ? new Date(filters.to).toISOString() : undefined
  const invalidRange = Boolean(from && to && from > to)
  const query: StatementQuery = { currency: filters.currency, type: (filters.type || undefined) as StatementQuery['type'], from, to, page: filters.page, size: 20 }
  const requestKey = JSON.stringify([accountNumber, query, revision])
  const current = result?.key === requestKey ? result : undefined
  const data = current?.data
  const loading = Boolean(accountNumber && !invalidRange && !current)

  useEffect(() => {
    if (!accountNumber || invalidRange) return
    const controller = new AbortController()
    let active = true
    getAccountStatement(accountNumber, JSON.parse(requestKey)[1], controller.signal).then(
      data => { if (active) setResult({ key: requestKey, data }) },
      error => { if (active) setResult({ key: requestKey, error: error instanceof Error ? error.message : 'Unable to load statement.' }) },
    )
    return () => { active = false; controller.abort() }
  }, [accountNumber, invalidRange, requestKey])

  useEffect(() => {
    if (!selected) return
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', listener)
    return () => { document.removeEventListener('keydown', listener); previous?.focus() }
  }, [selected])

  function changeFilter<K extends keyof typeof filters>(key: K, value: typeof filters[K]) {
    setFilters(previous => ({ ...previous, [key]: value, page: key === 'page' ? Number(value) : 0 }))
    setSelected(null)
    setCopyMessage('')
  }

  return <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
    <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
      <div className="px-gutter py-space-lg flex flex-col gap-space-lg max-w-[1400px] mx-auto w-full">
        <div className="flex flex-wrap items-end justify-between gap-space-md">
          <div><div className="text-body-sm text-on-surface-variant"><Link to="/dashboard">Dashboard</Link> / Transactions</div>
            <h1 className="font-headline-lg text-headline-lg font-bold mt-2">Transactions</h1>
            <p className="text-on-surface-variant">Account ledger postings, in the order returned by the bank.</p></div>
          <div className="flex gap-space-sm"><button className={button} disabled={!accountNumber || loading || invalidRange} onClick={() => { setSelected(null); setRevision(value => value + 1) }}>Refresh statement</button>
            <Link className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary" to="/transfers">Create Transfer</Link></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[
            ['Current balance', data ? formatMoney(data.currentBalanceMinor, data.currency) : '—'],
            ['Matching ledger entries', data ? String(data.totalItems) : '—'],
            ['Selected currency', filters.currency],
            ['Page', data ? `${data.page + 1} of ${Math.max(1, data.totalPages)}` : '—'],
          ].map(([label, value]) => <div key={label} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm"><p className="text-on-surface-variant text-body-sm">{label}</p><p className="font-headline-sm text-headline-sm font-semibold mt-2">{value}</p></div>)}
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <label>Currency<select className={control} value={filters.currency} onChange={event => changeFilter('currency', event.target.value as Currency)}><option>NGN</option><option>USD</option></select></label>
            <label>Direction<select className={control} value={filters.type} onChange={event => changeFilter('type', event.target.value)}><option value="">All</option><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></label>
            <label>From (local time)<input className={control} type="datetime-local" step="1" value={filters.from} onChange={event => changeFilter('from', event.target.value)} /></label>
            <label>To (local time)<input className={control} type="datetime-local" step="1" value={filters.to} onChange={event => changeFilter('to', event.target.value)} /></label>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-body-sm text-on-surface-variant"><span>Debit: money leaving this balance. Credit: money entering this balance.</span><button onClick={() => { setFilters({ currency: 'NGN', type: '', from: '', to: '', page: 0 }); setSelected(null) }}>Clear filters</button></div>
        </div>
        {!accountNumber && <p role="status">No account is associated with this customer.</p>}
        {invalidRange && <p role="alert">The start date must be before or equal to the end date.</p>}
        {loading && <p role="status">Loading ledger statement…</p>}
        {current?.error && <div role="alert" className="p-space-md rounded-xl bg-error-container text-error">Unable to load ledger statement: {current.error} <button className={button} onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
        {data && !invalidRange && <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><caption className="sr-only">{data.currency} ledger statement</caption>
            <thead className="bg-surface-container-low text-on-surface-variant text-label-sm"><tr>{['Posting reference', 'Timestamp', 'Reported kind', 'Direction', 'Amount', 'Currency', 'Balance after', 'Details'].map(label => <th key={label} className="p-space-md">{label}</th>)}</tr></thead>
            <tbody>{data.items.map(entry => <tr key={entry.id} className="border-t border-outline-variant/30 hover:bg-surface-container-low/40">
              <td className="p-space-md font-code-token">{entry.reference}</td><td className="p-space-md"><time dateTime={entry.createdAt}>{timestamp(entry.createdAt)}</time></td>
              <td className="p-space-md">{entry.kind}</td><td className="p-space-md"><span className={`rounded-full px-3 py-1 text-label-sm ${entry.type === 'CREDIT' ? 'bg-surface-container text-secondary' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>{entry.type}</span></td>
              <td className="p-space-md font-code-token">{formatMoney(entry.amountMinor, entry.currency)}</td><td className="p-space-md">{entry.currency}</td>
              <td className="p-space-md font-code-token">{entry.balanceAfterMinor === null ? 'Not supplied' : formatMoney(entry.balanceAfterMinor, entry.currency)}</td>
              <td className="p-space-md"><button className={button} aria-label={`View posting ${entry.id}`} onClick={() => { setCopyMessage(''); setSelected(entry) }}>View</button></td>
            </tr>)}</tbody></table></div>
          {data.items.length === 0 && <p role="status" className="p-space-lg text-center">No ledger entries match these filters.</p>}
          <div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm border-t border-outline-variant/30"><span>{data.totalItems} entries · Page {data.page + 1} of {Math.max(1, data.totalPages)}</span><div className="flex gap-space-sm">
            <button className={button} disabled={data.page === 0} onClick={() => changeFilter('page', data.page - 1)}>Previous</button>
            <button className={button} disabled={!data.hasNext} onClick={() => changeFilter('page', data.page + 1)}>Next</button></div></div>
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md text-body-sm text-on-surface-variant">
          {['Each row is a ledger posting, not a complete payment. Fees and reversals remain separate entries.', 'Reported kind may label FX or remittance postings as TRANSFER. It does not identify the underlying operation.', 'Balances after postings appear only when supplied by the backend. No running balance is calculated here.'].map(note => <p key={note} className="p-space-md rounded-xl bg-surface-container-low">{note}</p>)}
        </div>
      </div>
    </div>
    {selected && <div className="fixed inset-0 bg-primary-container/40 backdrop-blur-xs z-50 flex justify-end" onClick={() => setSelected(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="posting-title" className="w-full max-w-lg bg-surface-container-lowest h-full shadow-2xl overflow-y-auto flex flex-col" onClick={event => event.stopPropagation()}>
        <div className="p-space-lg bg-surface-container-low/40 flex justify-between items-center"><h2 id="posting-title" className="font-headline-sm text-headline-sm">Ledger posting</h2><button ref={closeButton} className={button} onClick={() => setSelected(null)} aria-label="Close posting details">Close</button></div>
        <div className="p-space-lg flex flex-col gap-space-lg"><div className="p-space-md rounded-xl bg-surface-container-low text-center"><p>{selected.type}</p><p className="text-headline-lg font-code-token">{formatMoney(selected.amountMinor, selected.currency)}</p></div>
          <dl className="divide-y divide-surface-container">{[
            ['Posting ID', String(selected.id)], ['Posting reference', selected.reference], ['Account', accountNumber], ['Currency', selected.currency], ['Reported kind', selected.kind], ['Timestamp', selected.createdAt],
            ...(selected.balanceAfterMinor === null ? [] : [['Balance after', formatMoney(selected.balanceAfterMinor, selected.currency)]]),
            ['Backend transferReference', selected.transferReference],
          ].map(([label, value]) => <div key={label} className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-on-surface-variant">{label}</dt><dd className="break-all font-code-token">{value}</dd></div>)}</dl>
          <p className="text-body-sm text-on-surface-variant">The backend transferReference is shown as supplied. It may not identify the underlying FX, remittance, or transfer operation.</p>
          <button className={button} onClick={async () => { try { await navigator.clipboard.writeText(selected.reference); setCopyMessage('Posting reference copied.') } catch { setCopyMessage('Unable to copy posting reference.') } }}>Copy posting reference</button>
          {copyMessage && <p role="status">{copyMessage}</p>}
        </div>
      </div>
    </div>}
  </div>
}

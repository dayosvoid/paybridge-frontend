import { useEffect, useState } from 'react'
import { getTransfers, type TransferPage } from '../api/transfers'
import { formatMoney } from '../lib/money'

export default function TransferHistory({ accountNumber, version }: { accountNumber: string; version: number }) {
  const [query, setQuery] = useState({ status: '', page: 0 })
  const [retry, setRetry] = useState(0)
  const key = JSON.stringify([accountNumber, query.status, query.page, version, retry])
  const [state, setState] = useState<{ key: string; data?: TransferPage; error?: string }>({ key: '' })
  const loading = Boolean(accountNumber) && (state.key !== key || (!state.data && !state.error))
  const data = state.key === key ? state.data : undefined
  const error = state.key === key ? state.error : undefined

  useEffect(() => {
    if (!accountNumber) return
    let cancelled = false
    setState({ key })
    getTransfers(accountNumber, query.status || undefined, query.page, 20).then(data => {
      if (!cancelled) setState({ key, data })
    }).catch(() => {
      if (!cancelled) setState({ key, error: 'Unable to load transfer history.' })
    })
    return () => { cancelled = true }
  }, [accountNumber, key, query.page, query.status])

  return <section aria-label="Transfer history" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
    <div className="flex flex-wrap items-center justify-between gap-space-sm">
      <h2 className="font-headline-sm text-headline-sm font-bold">Transfer history</h2>
      <div className="flex flex-wrap items-center gap-space-sm">
        <label className="text-body-sm">Status
          <select aria-label="Transfer history status" value={query.status} disabled={!accountNumber}
            onChange={event => setQuery({ status: event.target.value, page: 0 })}
            className="ml-2 rounded-lg bg-surface-container-low p-2">
            <option value="">All statuses</option><option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option><option value="FAILED">Failed</option>
          </select>
        </label>
        <button type="button" disabled={loading || !accountNumber} onClick={() => setRetry(value => value + 1)}
          className="px-space-md py-space-xs rounded-lg bg-surface-container-low text-body-sm">Refresh history</button>
      </div>
    </div>
    {!accountNumber && <p role="status">No account is available for transfer history.</p>}
    {loading && <p role="status">Loading transfer history…</p>}
    {error && <p role="alert">{error} Use Refresh history to try again.</p>}
    {data && <>
      {data.items.length === 0 ? <p role="status">No transfers found.</p> : <div className="overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead><tr className="border-b border-outline-variant/30">
            {['Reference', 'Source', 'Destination', 'Amount', 'Fee', 'Tax', 'Status'].map(label => <th key={label} className="p-3 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody>{data.items.map(transfer => <tr key={transfer.reference} className="border-b border-outline-variant/20">
            <td className="p-3 font-code-token">{transfer.reference}</td>
            <td className="p-3">{transfer.sourceAccount}</td><td className="p-3">{transfer.destinationAccount}</td>
            <td className="p-3 whitespace-nowrap">{formatMoney(transfer.amountMinor, transfer.currency)} {transfer.currency}</td>
            <td className="p-3">{formatMoney(transfer.feeMinor, transfer.currency)}</td>
            <td className="p-3">{formatMoney(transfer.taxMinor, transfer.currency)}</td>
            <td className="p-3">{transfer.status}<span className="block text-red-600">{transfer.failureReason}</span></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-space-sm text-body-sm">
        <span>Page {data.page + 1} of {Math.max(1, data.totalPages)} · {data.totalItems} transfers</span>
        <div className="flex gap-space-sm">
          <button type="button" disabled={loading || query.page === 0} onClick={() => setQuery(value => ({ ...value, page: Math.max(0, value.page - 1) }))}
            className="rounded-lg bg-surface-container-low px-3 py-2">Previous page</button>
          <button type="button" disabled={loading || !data.hasNext} onClick={() => setQuery(value => ({ ...value, page: value.page + 1 }))}
            className="rounded-lg bg-surface-container-low px-3 py-2">Next page</button>
        </div>
      </div>
    </>}
  </section>
}

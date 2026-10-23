import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRemittances } from '../hooks/useRemittances'
import { formatMoney } from '../lib/money'
import type { OutboundRemittanceView } from '../api/remittances'

function Status({ status }: { status: OutboundRemittanceView['status'] }) {
  const style = { PENDING: 'bg-tertiary-fixed text-on-tertiary-fixed', COMPLETED: 'bg-secondary-fixed/30 text-secondary',
    FAILED: 'bg-red-50 text-red-700', RETURNED: 'bg-slate-100 text-slate-700' }[status]
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold ${style}`}>
    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />{status}
  </span>
}

export default function RemittancesPage() {
  const { user } = useAuth()
  if (user?.role && user.role !== 'CUSTOMER') return <p role="alert" className="p-space-lg">Remittances are available to customers only.</p>
  const accountNumber = user?.accountNumber?.trim() || ''
  return <RemittancesWorkspace key={accountNumber} accountNumber={accountNumber} />
}

function RemittancesWorkspace({ accountNumber }: { accountNumber: string }) {
  const r = useRemittances(accountNumber)
  const [activeTab, setActiveTab] = useState<'send' | 'track'>('send')
  const [copyNotice, setCopyNotice] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (copyTimer.current) clearTimeout(copyTimer.current) } }, [])
  async function copyReference() {
    if (!r.details) return
    try { await navigator.clipboard.writeText(r.details.reference); if (mounted.current) setCopyNotice('Reference copied.') }
    catch { if (mounted.current) setCopyNotice('Could not copy the reference.') }
    if (mounted.current) { if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopyNotice(''), 2000) }
  }
  function view(reference: string) { setActiveTab('send'); void r.refreshDetails(reference) }
  const detail = r.details
  return <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
    {copyNotice && <p role="status" className="fixed bottom-4 right-4 z-[70] rounded-xl bg-primary-container p-4 text-on-primary shadow-xl">{copyNotice}</p>}
    <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-full p-space-md sm:p-gutter lg:p-margin gap-space-lg">
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
              <Link to="/dashboard">Dashboard</Link><span aria-hidden="true" className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Remittances</span>
            </div>
            <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-fixed/20 text-secondary font-label-sm text-[11px] tracking-wide font-bold">Demo provider quotes</span>
          </div>
          <div className="flex flex-col gap-1 max-w-2xl">
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Remittances</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Compare provider offers, send NGN-funded remittances to USD beneficiaries, and track your payouts.</p>
          </div>
          <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant">Providers currently simulate payouts. Real provider payouts are not enabled.</p>
          <div className="flex flex-wrap items-center p-1 rounded-xl bg-surface-container-low max-w-fit shadow-sm">
            <button type="button" aria-pressed={activeTab === 'send'} onClick={() => setActiveTab('send')}
              className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all ${activeTab === 'send' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Send Remittance</button>
            <button type="button" aria-pressed={activeTab === 'track'} onClick={() => setActiveTab('track')}
              className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all ${activeTab === 'track' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Track &amp; History</button>
          </div>
        </div>
        {!accountNumber && <p role="alert">No account is associated with this customer.</p>}
        {r.balancesError && <p role="alert" className="rounded-xl bg-surface-container-lowest p-space-md">{r.balancesError} <button type="button" onClick={r.retryBalances} className="underline">Retry balances</button></p>}
        {accountNumber && !r.balancesLoading && !r.balancesError && r.ngnAccount?.status !== 'ACTIVE' && <p role="status">An active NGN balance is required for outbound remittances.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {[
            { title: 'NGN funding balance', value: r.balancesLoading ? 'Loading…' : r.ngnAccount ? formatMoney(r.ngnAccount.balanceMinor, 'NGN') : 'Unavailable', note: r.ngnAccount?.status ?? 'NGN funding account' },
            { title: 'USD balance', value: r.balancesLoading ? 'Loading…' : r.usdAccount ? formatMoney(r.usdAccount.balanceMinor, 'USD') : 'Unavailable', note: 'Outbound payouts are funded from NGN' },
            { title: 'Customer remittances', value: r.history ? String(r.history.totalItems) : '—', note: 'Your recorded outbound remittances' },
            { title: 'Selected provider fee', value: r.selected ? formatMoney(r.selected.feeMinor, 'NGN') : '—', note: r.selected?.providerName ?? 'Select a provider offer' },
          ].map(card => <div key={card.title} className="flex flex-col p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
            <span className="text-on-surface-variant font-label-sm text-label-sm">{card.title}</span>
            <strong className="mt-space-sm font-headline-md text-headline-md tracking-tight">{card.value}</strong>
            <span className="mt-2 text-on-surface-variant font-body-sm text-body-sm">{card.note}</span>
          </div>)}
        </div>
        <div hidden={activeTab !== 'send'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            <section aria-label="Send remittance" className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-lowest p-space-md sm:p-space-lg rounded-2xl shadow-sm">
              <div className="flex flex-col pb-space-sm"><h2 className="font-headline-sm text-headline-sm font-bold">Send International Remittance</h2><p className="font-body-sm text-body-sm text-on-surface-variant">Review an actual provider offer before confirming your payout.</p></div>
              {r.error && <p role="alert" className="text-red-600 text-body-sm">{r.error}</p>}
              {r.uncertain && <p role="status" className="text-amber-800 text-body-sm">The payout outcome is unconfirmed. Do not start another payout. Retry only this same payout with its original details.</p>}
              <div className="flex flex-col p-space-md rounded-xl bg-surface-container-low gap-space-sm">
                <div className="flex items-center justify-between gap-space-sm"><span className="font-label-md text-label-md">1 · NGN funding account</span><span className="font-code-token text-[11px] text-on-surface-variant">{accountNumber ? '…' + accountNumber.slice(-4) : 'Unavailable'}</span></div>
                <label htmlFor="remittance-amount" className="font-label-sm text-label-sm text-on-surface-variant">Source amount (NGN)</label>
                <div className="relative flex items-center">
                  <span aria-hidden="true" className="absolute left-3.5 font-headline-sm text-headline-sm font-semibold">₦</span>
                  <input id="remittance-amount" type="text" inputMode="decimal" value={r.amount} disabled={r.locked} onChange={event => r.changeAmount(event.target.value)} className="w-full bg-surface-container-lowest pl-9 pr-36 py-2.5 rounded-lg font-code-token text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-secondary transition-all shadow-inner" />
                  <div className="absolute right-2 flex items-center gap-1">{[25, 50, 100].map(percent => <button key={percent} type="button" disabled={!r.canQuote} onClick={() => r.percentage(percent)} className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-[10px] font-bold font-code-token transition-colors">{percent === 100 ? 'Max' : percent + '%'}</button>)}</div>
                </div>
                <span className="text-body-sm text-on-surface-variant">Destination currency: USD</span>
                <button type="button" disabled={!r.canQuote || r.quoteLoading} onClick={r.requestQuotes} className="py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md hover:bg-inverse-surface transition-colors">{r.quoteLoading ? 'Requesting offers…' : 'Compare provider quotes'}</button>
              </div>
              <fieldset className="flex flex-col p-space-md rounded-xl bg-surface-container-low gap-space-sm min-w-0">
                <legend className="font-label-md text-label-md">2 · Compare provider offers</legend>
                {!r.offers.length && <p className="text-body-sm text-on-surface-variant">Request provider quotes to compare their rates, fees, and arrival estimates.</p>}
                {r.offers.map(offer => {
                  const expired = Date.parse(offer.expiresAt) <= r.now
                  return <label key={offer.quoteId} className={`flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-lowest shadow-sm ${r.selected?.quoteId === offer.quoteId ? 'ring-2 ring-secondary' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-space-sm"><span className="flex items-center gap-space-sm font-semibold"><input type="radio" name="remittance-provider" aria-label={offer.providerName + ' offer'} checked={r.selected?.quoteId === offer.quoteId} disabled={r.locked || expired} onChange={() => r.selectOffer(offer)} />{offer.providerName}</span><span className="font-code-token text-[11px] text-on-surface-variant">{offer.providerId}</span></div>
                    <div className="flex flex-wrap gap-1">{offer.tags.map(tag => <span key={tag} className="rounded-full px-2 py-0.5 bg-secondary-fixed/30 text-secondary text-[11px] font-semibold">{tag.replace(/_/g, ' ')}</span>)}</div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs text-body-sm">
                      <div><dt className="text-on-surface-variant">Rate</dt><dd className="font-code-token">1 NGN = {offer.rate} USD</dd></div>
                      <div><dt className="text-on-surface-variant">Receive</dt><dd className="font-code-token font-bold text-secondary">{formatMoney(offer.destinationAmountMinor, 'USD')} USD</dd></div>
                      <div><dt className="text-on-surface-variant">Provider fee</dt><dd className="font-code-token">{formatMoney(offer.feeMinor, 'NGN')} NGN</dd></div>
                      <div><dt className="text-on-surface-variant">Total debit</dt><dd className="font-code-token font-bold">{formatMoney(offer.totalDebitMinor, 'NGN')} NGN</dd></div>
                      <div><dt className="text-on-surface-variant">Estimated arrival</dt><dd>{offer.etaMinutes} minutes</dd></div>
                      <div><dt className="text-on-surface-variant">Expires at</dt><dd><time dateTime={offer.expiresAt}>{offer.expiresAt}</time></dd></div>
                    </dl>
                    {expired && <p className="text-amber-800 text-body-sm">Offer expired</p>}
                  </label>
                })}
              </fieldset>
              <div className="flex flex-col p-space-md rounded-xl bg-surface-container-low gap-space-sm">
                <h3 className="font-label-md text-label-md">3 · Beneficiary details</h3>
                {([
                  ['name', 'Beneficiary name', r.beneficiaryName], ['account', 'Beneficiary account', r.beneficiaryAccount], ['bank', 'Beneficiary bank', r.beneficiaryBank],
                ] as const).map(([field, label, value]) => <div key={field} className="flex flex-col gap-1"><label htmlFor={'remittance-' + field} className="font-label-sm text-label-sm text-on-surface-variant">{label}</label><input id={'remittance-' + field} type="text" value={value} required disabled={r.locked} onChange={event => r.changeBeneficiary(field, event.target.value)} className="w-full bg-surface-container-lowest px-3 py-2.5 rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary shadow-inner" /></div>)}
              </div>
              {r.selected && <div className="flex flex-col p-space-md rounded-xl bg-surface-container gap-space-sm">
                <h3 className="font-label-md text-label-md">Selected offer: {r.selected.providerName}</h3>
                <p className="font-code-token text-body-sm">{formatMoney(r.selected.sourceAmountMinor, 'NGN')} NGN + {formatMoney(r.selected.feeMinor, 'NGN')} NGN provider fee</p>
                <p className="font-code-token font-bold">Total debit: {formatMoney(r.selected.totalDebitMinor, 'NGN')} NGN</p>
                <p>Beneficiary receives {formatMoney(r.selected.destinationAmountMinor, 'USD')} USD</p>
                {r.expired && !r.uncertain && !r.submission && <p role="status" className="text-amber-800 text-body-sm">The selected offer has expired. Request fresh quotes and confirm an offer.</p>}
                {!r.uncertain && !r.submission && <label className="flex items-start gap-space-sm text-body-sm"><input type="checkbox" checked={r.confirmed} disabled={r.expired || r.sending} onChange={event => r.setConfirmed(event.target.checked)} />I confirm the selected offer and beneficiary details.</label>}
              </div>}
              <button type="button" onClick={r.submit} disabled={r.sending || Boolean(r.submission) || !r.selected || (!r.uncertain && (r.expired || !r.confirmed))} className="w-full py-3.5 px-space-md rounded-xl bg-primary-container hover:bg-inverse-surface text-on-primary font-label-md text-label-md shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-space-sm disabled:opacity-75">{r.sending ? 'Submitting payout…' : r.uncertain ? 'Retry same payout' : 'Confirm payout'}</button>
              {r.submission && <button type="button" disabled={r.sending || r.detailLoading} onClick={r.startAnother} className="rounded-lg bg-surface-container p-3">Start another remittance</button>}
            </section>
            <section aria-label="Remittance details" className="lg:col-span-5 flex flex-col p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm gap-space-md">
              <h2 className="font-headline-sm text-headline-sm font-bold">Remittance Lifecycle Tracker</h2>
              {r.detailLoading && <p role="status">Loading remittance details…</p>}
              {r.detailError && <p role="alert">{r.detailError}</p>}
              {!detail ? <p className="text-body-sm text-on-surface-variant">Submit a payout or select a remittance from your history to view its actual status.</p> : <>
                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between gap-space-sm"><strong className="font-code-token break-all">{detail.reference}</strong><button type="button" onClick={copyReference} aria-label="Copy remittance reference" className="text-on-surface-variant"><span aria-hidden="true" className="material-symbols-outlined text-[18px]">content_copy</span></button></div>
                  <div><Status status={detail.status} /></div>
                  {detail.status === 'PENDING' && <p className="text-body-sm text-on-surface-variant">The payout is pending provider confirmation. It has not been completed.</p>}
                  {detail.status === 'COMPLETED' && <p className="text-body-sm">The demo payout is completed.</p>}
                  {detail.status === 'FAILED' && <p className="text-body-sm text-red-700">The payout failed.</p>}
                  {detail.status === 'RETURNED' && <p className="text-body-sm">The demo payout was returned. Check your updated NGN balance.</p>}
                </div>
                <dl className="flex flex-col gap-space-sm text-body-sm">
                  {[
                    ['Beneficiary', detail.beneficiaryName], ['Beneficiary account', detail.beneficiaryAccount], ['Beneficiary bank', detail.beneficiaryBank || 'Not provided'],
                    ['Provider ID', detail.providerId], ['Provider reference', detail.providerReference || 'Not provided'], ['Quote ID', detail.quoteId], ['Source account', detail.sourceAccount],
                    ['Source amount', formatMoney(detail.sourceAmountMinor, 'NGN') + ' NGN'], ['Provider fee', formatMoney(detail.feeMinor, 'NGN') + ' NGN'],
                    ['Destination amount', formatMoney(detail.destinationAmountMinor, 'USD') + ' USD'], ['Rate', '1 NGN = ' + detail.rate + ' USD'],
                  ].map(([label, value]) => <div key={label} className="flex flex-wrap items-start justify-between gap-space-xs border-b border-surface-container-low pb-2"><dt className="text-on-surface-variant">{label}</dt><dd className="font-medium break-all">{value}</dd></div>)}
                  <div><dt className="text-on-surface-variant">Created at</dt><dd><time dateTime={detail.createdAt}>{detail.createdAt}</time></dd></div>
                </dl>
                {detail.failureReason && <p className="text-red-700">Reason: {detail.failureReason}</p>}
                <button type="button" disabled={r.detailLoading} onClick={() => r.refreshDetails(detail.reference)} className="rounded-lg bg-surface-container p-3">Refresh remittance status</button>
              </>}
              <p className="text-body-sm text-on-surface-variant">Statuses reflect provider reports. Use Refresh remittance status to check for updates.</p>
            </section>
          </div>
        </div>
        <section aria-label="Customer remittance history" className="flex flex-col p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm gap-space-md mt-space-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-sm"><h2 className="font-headline-sm text-headline-sm font-bold">Your remittance history</h2><button type="button" disabled={!accountNumber || r.historyLoading} onClick={r.refreshHistory} className="px-3 py-2 rounded-lg bg-surface-container-low">Refresh history</button></div>
          {!accountNumber && <p>No account is available for remittance history.</p>}
          {r.historyLoading && <p role="status">Loading remittance history…</p>}
          {r.historyError && <div role="alert"><p>{r.historyError}</p><button type="button" onClick={r.refreshHistory} className="mt-2 underline">Retry history</button></div>}
          {r.history && <>
            {!r.history.items.length ? <p role="status">No remittances found.</p> : <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-body-sm border-collapse min-w-[850px]">
                <thead><tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">{['Reference / Created', 'Beneficiary / Bank', 'Provider', 'Principal (NGN)', 'Fee (NGN)', 'Receive (USD)', 'Status', 'Details'].map(label => <th key={label} className="py-space-sm px-space-md">{label}</th>)}</tr></thead>
                <tbody>{r.history.items.map(item => <tr key={item.reference} className="hover:bg-surface-container-low/40 transition-colors border-b border-surface-container-low">
                  <td className="py-3.5 px-space-md"><strong className="block font-code-token text-[12px]">{item.reference}</strong><time className="text-[11px] text-on-surface-variant" dateTime={item.createdAt}>{item.createdAt}</time></td>
                  <td className="py-3.5 px-space-md">{item.beneficiaryName}<span className="block text-[11px] text-on-surface-variant">{item.beneficiaryBank || 'Not provided'}</span></td>
                  <td className="py-3.5 px-space-md">{item.providerId}</td>
                  <td className="py-3.5 px-space-md font-code-token">{formatMoney(item.sourceAmountMinor, 'NGN')}</td>
                  <td className="py-3.5 px-space-md font-code-token">{formatMoney(item.feeMinor, 'NGN')}</td>
                  <td className="py-3.5 px-space-md font-code-token font-bold">{formatMoney(item.destinationAmountMinor, 'USD')}</td>
                  <td className="py-3.5 px-space-md"><Status status={item.status} /></td>
                  <td className="py-3.5 px-space-md"><button type="button" disabled={r.detailLoading} onClick={() => view(item.reference)} aria-label={'View remittance ' + item.reference} className="underline">View / Refresh</button></td>
                </tr>)}</tbody>
              </table>
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container-low text-body-sm text-on-surface-variant">
              <span>Page {r.history.page + 1} of {Math.max(1, r.history.totalPages)} · {r.history.totalItems} remittances</span>
              <div className="flex gap-space-xs"><button type="button" disabled={r.historyLoading || r.historyPage === 0} onClick={r.previousPage} className="px-3 py-1.5 rounded-lg bg-surface-container-low">Previous page</button><button type="button" disabled={r.historyLoading || !r.history.hasNext} onClick={r.nextPage} className="px-3 py-1.5 rounded-lg bg-surface-container-low">Next page</button></div>
            </div>
          </>}
        </section>
      </div>
    </div>
  </div>
}

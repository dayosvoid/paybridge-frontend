import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFxConversion } from '../hooks/useFxConversion'
import { formatMajor, formatMoney } from '../lib/money'

function rateLabel(rateType: string) { return rateType === 'DEMO_CONFIGURED' ? 'Configured demo rate (DEMO_CONFIGURED)' : rateType }

export default function FXConversionPage() {
  const { user } = useAuth()
  const accountNumber = user?.accountNumber?.trim() || ''
  return <FxWorkspace key={accountNumber} accountNumber={accountNumber} />
}

function FxWorkspace({ accountNumber }: { accountNumber: string }) {
  const fx = useFxConversion(accountNumber)
  const { payAmount, quote, result, records, sourceAccount, destinationAccount } = fx
  const formattedReceiveAmount = quote ? formatMajor(quote.destinationAmountMinor) : '—'
  const [copyNotice, setCopyNotice] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (copyTimer.current) clearTimeout(copyTimer.current) } }, [])
  async function handleCopyRef() {
    if (!quote) return
    try { await navigator.clipboard.writeText(quote.quoteId); if (mounted.current) setCopyNotice('Quote ID copied.') }
    catch { if (mounted.current) setCopyNotice('Could not copy the quote ID.') }
    if (mounted.current) { if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopyNotice(''), 2000) }
  }

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {copyNotice && <p role="status" className="fixed bottom-4 right-4 z-[70] rounded-xl bg-primary-container p-4 text-on-primary">{copyNotice}</p>}
        <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col w-full">
            <div className="px-gutter py-space-lg flex flex-col gap-space-lg max-w-[1400px] mx-auto w-full">
              
              {/* Header / Context Telemetry */}
              <div className="flex flex-col gap-space-sm">
                <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                  <Link className="hover:text-on-surface transition-colors" to="/dashboard">Dashboard</Link>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-on-surface">FX &amp; Conversion</span>
                </nav>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                        FX &amp; Currency Conversion
                      </h1>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-[11px] tracking-wide uppercase font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Stored conversion quote
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Get an exchange quote and convert between your supported currency accounts.
                    </p>
                  </div>
                </div>

                {/* Informational Settlement Notice */}
                <div className="flex items-start gap-space-sm p-space-md rounded-lg bg-surface-container-lowest shadow-sm mt-space-xs">
                  <span className="material-symbols-outlined text-[20px] text-secondary mt-0.5">info</span>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Request a quote, review its amounts and expiration, then confirm the conversion. Rates are supplied by PayBridge; configured demo rates are labelled.
                    </p>
                    <span className="font-label-sm text-label-sm text-secondary font-medium tracking-tight whitespace-nowrap">
                      NGN → USD
                    </span>
                  </div>
                </div>
              </div>

              {!accountNumber && <p role="alert">No account is associated with this customer.</p>}
              {fx.balancesLoading && <p role="status">Loading currency balances…</p>}
              {fx.balancesError && <p role="alert">{fx.balancesError} <button type="button" onClick={fx.retryBalances} className="underline">Retry balances</button></p>}
              {accountNumber && !fx.balancesLoading && !fx.balancesError && (!sourceAccount || !destinationAccount || sourceAccount.status !== 'ACTIVE' || destinationAccount.status !== 'ACTIVE') && <p role="status">Active NGN and USD accounts are required to convert.</p>}
              {fx.error && <p role="alert" className="rounded-lg bg-surface-container-lowest p-space-md text-red-600">{fx.error}</p>}
              {fx.uncertain && <p role="status" className="rounded-lg bg-surface-container-lowest p-space-md text-amber-800">The conversion outcome is unconfirmed. Retry only the same conversion; do not request a replacement quote.</p>}
              {/* Main Conversion Interface: Asymmetric Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                
                {/* Left Column: Primary Interactive Conversion Card (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg relative overflow-hidden">
                    
                    {/* Top Card Meta Header */}
                    <div className="flex items-center justify-between pb-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                        <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px]">
                          Swap Execution Desk
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Review before confirming</span>
                      </div>
                    </div>

                    {/* Step 1: Source Currency "You Pay" Section */}
                    <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                          Step 1 • You Pay
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                            account_balance_wallet
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
                            Available:{' '}
                            <span className="font-semibold text-on-surface">
                              {fx.balancesLoading ? 'Loading…' : sourceAccount ? formatMoney(sourceAccount.balanceMinor, 'NGN') + ' NGN' : 'Unavailable'}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-space-sm pt-space-xs">
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <span className="font-headline-md text-headline-md text-on-surface-variant font-medium">
                              ₦
                            </span>
                            <input
                              id="fx-source-amount" aria-label="Source amount" type="text" inputMode="decimal" disabled={fx.locked}
                              className="w-full bg-transparent font-headline-md text-headline-md text-on-surface font-bold tracking-tight focus:outline-none p-0"
                              value={payAmount}
                              onChange={(e) => fx.changeAmount(e.target.value)}
                              placeholder="0.00"

                            />
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] pt-1">
                            {sourceAccount ? 'Account: …' + sourceAccount.accountNumber.slice(-4) : 'Account unavailable'}
                          </span>
                        </div>
                        {/* Currency Pill */}
                        <div className="flex items-center gap-space-xs bg-surface-container-lowest px-3 py-2 rounded-lg shadow-sm">
                          <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px]">
                            ₦
                          </div>
                          <span className="font-label-md text-label-md text-on-surface font-bold">
                            NGN
                          </span>
                          
                        </div>
                      </div>

                      {/* Percentage Shortcut Chips */}
                      <div className="flex items-center justify-between pt-space-xs mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={fx.locked || !fx.canQuote} onClick={() => fx.percentage(25)}
                            className="percent-btn px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface hover:bg-inverse-surface hover:text-on-primary transition-colors font-label-sm text-[11px] shadow-sm"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            disabled={fx.locked || !fx.canQuote} onClick={() => fx.percentage(50)}
                            className="percent-btn px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface hover:bg-inverse-surface hover:text-on-primary transition-colors font-label-sm text-[11px] shadow-sm"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            disabled={fx.locked || !fx.canQuote} onClick={() => fx.percentage(100)}
                            className="percent-btn px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface hover:bg-inverse-surface hover:text-on-primary transition-colors font-label-sm text-[11px] shadow-sm"
                          >
                            Max
                          </button>
                        </div>
                        <span className="font-code-token text-[11px] text-on-surface-variant">
                          {sourceAccount?.status ?? 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    {/* Circular Swap Currencies Button */}
                    <div className="relative flex items-center justify-center my-[-10px] z-10">
                      <div className="h-[1px] w-full bg-surface-container absolute"></div>
                      <button
                        type="button"
                        disabled
                        aria-label="Reverse Currency Pair"
                        className="relative w-11 h-11 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-on-surface hover:bg-primary-container hover:text-on-primary transition-all duration-300 transform active:rotate-180 hover:scale-105"
                        title="Reverse conversion is unavailable"
                      >
                        <span className="material-symbols-outlined text-[20px]">swap_vert</span>
                      </button>
                    </div>

                    {/* Step 2: Destination Currency "You Receive" Section */}
                    <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-low transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                          Step 2 • Quoted Amount to Receive
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-secondary">sync_alt</span>
                          <span className="font-body-sm text-body-sm text-secondary font-medium text-[11px]">
                            {quote ? '1 ' + quote.sourceCurrency + ' = ' + quote.rate + ' ' + quote.destinationCurrency : 'Request a stored quote'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-space-sm pt-space-xs">
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <span className="font-headline-md text-headline-md text-on-surface-variant font-medium">
                              $
                            </span>
                            <input
                              type="text"
                              readOnly aria-label="Quoted destination amount"
                              className="w-full bg-transparent font-headline-md text-headline-md text-on-surface font-bold tracking-tight focus:outline-none p-0 cursor-default"
                              value={formattedReceiveAmount}
                            />
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] pt-1">
                            {fx.balancesLoading ? 'Loading…' : destinationAccount ? 'Destination account: …' + destinationAccount.accountNumber.slice(-4) + ' · Balance: ' + formatMoney(destinationAccount.balanceMinor, 'USD') : 'Destination account unavailable'}
                          </span>
                        </div>
                        {/* Destination Currency Pill */}
                        <div className="flex items-center gap-space-xs bg-surface-container-lowest px-3 py-2 rounded-lg shadow-sm">
                          <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[10px]">
                            $
                          </div>
                          <span className="font-label-md text-label-md text-on-surface font-bold">
                            USD
                          </span>
                          
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-space-xs mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
                            {destinationAccount?.status ?? 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-space-sm pt-space-xs">
                      <button type="button" onClick={fx.requestQuote} disabled={!fx.canQuote || fx.quoteLoading}
                        className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-sm hover:bg-inverse-surface active:scale-[0.99] transition-all shadow-sm">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">request_quote</span>
                        {fx.quoteLoading ? 'Requesting quote…' : 'Request quote'}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Stored quote and conversion summary */}
                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  
                  <section aria-label="Stored quote" className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md relative overflow-hidden">
                    <h2 className="font-headline-sm text-headline-sm font-bold">Stored exchange quote</h2>
                    {!quote ? <p className="text-body-sm text-on-surface-variant">Enter an amount and request a quote to review the conversion.</p> : <>
                      <div className="flex flex-wrap justify-between items-center gap-space-sm">
                        <span className="font-code-token text-label-sm break-all">{quote.quoteId}</span>
                        <button type="button" onClick={handleCopyRef} aria-label="Copy quote ID" className="text-on-surface-variant"><span aria-hidden="true" className="material-symbols-outlined text-[18px]">content_copy</span></button>
                        <span className="rounded-full bg-surface-container px-3 py-1 text-body-sm">{fx.expired ? 'Quote expired' : Math.max(0, Math.ceil((Date.parse(quote.expiresAt) - fx.now) / 1000)) + 's remaining'}</span>
                      </div>
                      <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Exchange rate</span>
                        <strong className="font-headline-sm text-headline-sm">1 {quote.sourceCurrency} = {quote.rate} {quote.destinationCurrency}</strong>
                        <span className="text-body-sm">{rateLabel(quote.rateType)}</span>
                      </div>
                      <dl className="flex flex-col gap-space-sm font-body-sm text-body-sm">
                        <div className="flex justify-between gap-space-sm"><dt>Source amount</dt><dd className="font-code-token">{formatMoney(quote.sourceAmountMinor, quote.sourceCurrency)} {quote.sourceCurrency}</dd></div>
                        <div className="flex justify-between gap-space-sm"><dt>Destination amount</dt><dd className="font-code-token font-bold text-secondary">{formatMoney(quote.destinationAmountMinor, quote.destinationCurrency)} {quote.destinationCurrency}</dd></div>
                        <div className="flex flex-wrap justify-between gap-space-sm"><dt>Expires at</dt><dd><time dateTime={quote.expiresAt}>{quote.expiresAt}</time></dd></div>
                      </dl>
                      {!result && !fx.uncertain && <label className="flex items-start gap-space-sm text-body-sm">
                        <input type="checkbox" checked={fx.confirmed} disabled={fx.expired || fx.executing} onChange={event => fx.setConfirmed(event.target.checked)} />
                        I confirm the quoted amounts and rate.
                      </label>}
                      <button type="button" onClick={fx.execute}
                        disabled={fx.executing || Boolean(result) || (!fx.uncertain && (fx.expired || !fx.confirmed))}
                        className="w-full h-12 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-sm hover:bg-inverse-surface active:scale-[0.99] transition-all shadow-md disabled:opacity-75">
                        {fx.executing ? 'Converting…' : fx.uncertain ? 'Retry same conversion' : 'Confirm conversion'}
                      </button>
                      {fx.expired && !fx.uncertain && !result && <p role="status" className="text-body-sm text-amber-800">This quote has expired. Request a new quote and confirm its amounts before converting.</p>}
                    </>}
                  </section>
                  {result && <section aria-label="Conversion result" className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md">
                    <h2 className="font-headline-sm text-headline-sm font-bold">Conversion result</h2>
                    <p>Status: <strong>{result.status}</strong></p>
                    <p className="font-code-token break-all">{result.reference}</p>
                    <p>{formatMoney(result.sourceAmountMinor, result.sourceCurrency)} {result.sourceCurrency} → {formatMoney(result.destinationAmountMinor, result.destinationCurrency)} {result.destinationCurrency}</p>
                    <p>1 {result.sourceCurrency} = {result.rate} {result.destinationCurrency}</p>
                    <p className="text-body-sm">{rateLabel(result.rateType)}</p>
                    {result.failureReason && <p className="text-red-600">{result.failureReason}</p>}
                    <p className="text-body-sm">Created: <time dateTime={result.createdAt}>{result.createdAt}</time></p>
                    {result.status !== 'SUCCESS' && result.status !== 'FAILED' && <p className="text-body-sm text-on-surface-variant">The final conversion outcome is not confirmed. Refresh its status before starting another conversion.</p>}
                    <button type="button" disabled={fx.refreshing || fx.executing} onClick={() => fx.refreshResult(result.reference)} className="rounded-lg bg-surface-container p-3">{fx.refreshing ? 'Refreshing…' : 'Refresh conversion status'}</button>
                  </section>}

                  {/* How FX Conversion Works Informational Panel */}
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider text-[11px]">
                        How conversion works
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">4 Step Guide</span>
                    </div>
                    <div className="flex flex-col gap-space-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-label-sm text-[11px] font-bold shrink-0">
                          1
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                            Enter an amount
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                            Enter the NGN amount to convert to USD.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-label-sm text-[11px] font-bold shrink-0">
                          2
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                            Request a stored quote
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                            Review the rate type and expiration returned by PayBridge.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-label-sm text-[11px] font-bold shrink-0">
                          3
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                            Review the quoted amounts
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                            Check the source and destination amounts before confirming.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-label-sm text-[11px] font-bold shrink-0">
                          4
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                            Confirm the conversion
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                            Confirm once, then review the returned conversion status.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <section aria-label="Conversion records" className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md mt-space-sm">
                <h2 className="font-headline-sm text-headline-sm font-bold">Conversions viewed in this session</h2>
                <p className="text-body-sm text-on-surface-variant">Only conversion records returned on this page are shown. This is not a complete conversion history.</p>
                {records.length === 0 ? <p>No conversion records are available in this session.</p> : <div className="overflow-x-auto w-full">
                  <table className="w-full text-left font-body-sm text-body-sm border-collapse min-w-[850px]">
                    <thead><tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">
                      {['Reference', 'Created', 'Pair', 'Source amount', 'Destination amount', 'Rate', 'Rate type', 'Status'].map(label => <th key={label} className="py-space-sm px-space-md">{label}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-surface-container">{records.map(record => <tr key={record.reference} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-space-md px-space-md font-code-token">{record.reference}</td>
                      <td className="py-space-md px-space-md"><time dateTime={record.createdAt}>{record.createdAt}</time></td>
                      <td className="py-space-md px-space-md">{record.sourceCurrency} → {record.destinationCurrency}</td>
                      <td className="py-space-md px-space-md font-code-token">{formatMoney(record.sourceAmountMinor, record.sourceCurrency)}</td>
                      <td className="py-space-md px-space-md font-code-token text-secondary">{formatMoney(record.destinationAmountMinor, record.destinationCurrency)}</td>
                      <td className="py-space-md px-space-md font-code-token">{record.rate}</td>
                      <td className="py-space-md px-space-md">{rateLabel(record.rateType)}</td>
                      <td className="py-space-md px-space-md">{record.status}<span className="block text-red-600">{record.failureReason}</span></td>
                    </tr>)}</tbody>
                  </table>
                </div>}
              </section>

            </div>
          </div>
        </div>
    </div>
  );
}

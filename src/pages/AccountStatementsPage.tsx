import React, { useState } from 'react';

interface ArchiveItem {
  id: string;
  title: string;
  subtitle: string;
  fileSize: string;
  generatedDate: string;
}

const ARCHIVED_STATEMENTS: ArchiveItem[] = [
  {
    id: 'arch-1',
    title: 'September 2024',
    subtitle: 'NGN Primary (012 •••• 8492)',
    fileSize: '184 KB',
    generatedDate: 'Generated Oct 01, 2024',
  },
  {
    id: 'arch-2',
    title: 'August 2024',
    subtitle: 'NGN Primary (012 •••• 8492)',
    fileSize: '210 KB',
    generatedDate: 'Generated Sep 01, 2024',
  },
  {
    id: 'arch-3',
    title: 'Q3 2024 Consolidated',
    subtitle: 'USD Vault (849 •••• 1039)',
    fileSize: '340 KB',
    generatedDate: 'Generated Oct 02, 2024',
  },
];

interface LedgerRow {
  date: string;
  time: string;
  ref: string;
  description: string;
  subDescription: string;
  type: string;
  typeBadgeClass: string;
  moneyIn: string;
  moneyOut: string;
  balance: string;
  statusText: string;
  statusClass: string;
}

const LEDGER_ROWS: LedgerRow[] = [
  {
    date: 'Oct 24, 2024',
    time: '16:42:10 UTC',
    ref: 'PB-TR-994102',
    description: 'Inbound Wire: Sterling Global Logistics',
    subDescription: 'NXP Inward Settlement #982-1',
    type: 'Inbound Wire',
    typeBadgeClass: 'bg-secondary/15 text-secondary',
    moneyIn: '+₦6,930,000.00',
    moneyOut: '—',
    balance: '₦8,450,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 22, 2024',
    time: '11:15:33 UTC',
    ref: 'PB-RM-982104',
    description: 'Outbound Remittance: David Sterling',
    subDescription: 'Supplier Payroll Settlement #2901',
    type: 'Remittance',
    typeBadgeClass: 'bg-surface-container text-on-surface-variant',
    moneyIn: '—',
    moneyOut: '-₦1,850,000.00',
    balance: '₦1,520,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 19, 2024',
    time: '09:05:42 UTC',
    ref: 'PB-FX-884920',
    description: 'FX Conversion USD → NGN',
    subDescription: 'Internal Clearing Node Rate ₦1,640.00',
    type: 'FX Settlement',
    typeBadgeClass: 'bg-surface-container text-on-surface',
    moneyIn: '+₦4,920,000.00',
    moneyOut: '—',
    balance: '₦3,370,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 14, 2024',
    time: '18:20:00 UTC',
    ref: 'PB-IN-850192',
    description: 'Merchant Settlement: Chioma Okonjo',
    subDescription: 'Point-of-Sale Batch Settlement POS-410',
    type: 'Inbound Wire',
    typeBadgeClass: 'bg-secondary/15 text-secondary',
    moneyIn: '+₦3,020,000.00',
    moneyOut: '—',
    balance: '-₦1,550,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 11, 2024',
    time: '13:45:19 UTC',
    ref: 'PB-TR-710488',
    description: 'Outbound Commercial Transfer',
    subDescription: 'Dangote Cement PLC Logistics Account',
    type: 'Transfer',
    typeBadgeClass: 'bg-surface-container text-on-surface-variant',
    moneyIn: '—',
    moneyOut: '-₦4,600,000.00',
    balance: '-₦4,570,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 07, 2024',
    time: '08:12:05 UTC',
    ref: 'PB-RM-692301',
    description: 'Outbound Vendor Wire',
    subDescription: 'Fidelity Cloud Architecture Group',
    type: 'Remittance',
    typeBadgeClass: 'bg-surface-container text-on-surface-variant',
    moneyIn: '—',
    moneyOut: '-₦5,200,000.00',
    balance: '₦30,000.00',
    statusText: 'Reconciled',
    statusClass: 'bg-secondary/15 text-secondary',
  },
  {
    date: 'Oct 01, 2024',
    time: '00:00:01 UTC',
    ref: 'LEDGER-OPEN',
    description: 'Brought Forward Ledger Balance',
    subDescription: 'Audited Closing from Sep 30, 2024',
    type: 'Opening State',
    typeBadgeClass: 'bg-surface-container text-on-surface-variant',
    moneyIn: '—',
    moneyOut: '—',
    balance: '₦5,230,000.00',
    statusText: 'Audited',
    statusClass: 'bg-secondary/15 text-secondary',
  },
];

export default function AccountStatementsPage() {
  // --- States ---
  const [ledgerState, setLedgerState] = useState<'active' | 'loading' | 'empty' | 'error'>('active');
  const [selectedAccount, setSelectedAccount] = useState<'ngn' | 'usd'>('ngn');
  const [startDate, setStartDate] = useState<string>('Oct 01, 2024');
  const [endDate, setEndDate] = useState<string>('Oct 31, 2024');

  const handleGenerate = () => {
    setLedgerState('loading');
    setTimeout(() => {
      setLedgerState('active');
    }, 700);
  };

  const copyRef = (refText: string) => {
    navigator.clipboard?.writeText(refText);
  };

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
        <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col w-full">
            
            {/* Interactive View State Controller (Sandbox) */}
            <div className="px-margin pt-space-md pb-space-xs flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-secondary">tune</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">View State Sandbox:</span>
              </div>
              <div className="flex flex-wrap items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => setLedgerState('active')}
                  className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                    ledgerState === 'active' ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Generated Statement (Active)
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerState('loading')}
                  className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                    ledgerState === 'loading' ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Period Loading Skeleton
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerState('empty')}
                  className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                    ledgerState === 'empty' ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  No Records Empty State
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerState('error')}
                  className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                    ledgerState === 'error' ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Date Validation Error
                </button>
              </div>
            </div>

            <div className="px-margin py-space-lg flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
              
              {/* Breadcrumb & Top Bar */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                    <span className="hover:text-secondary cursor-pointer transition-colors">Dashboard</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-on-surface font-medium">Account Statements</span>
                  </div>
                  <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Account Statements</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Review your account activity and access audited multi-currency financial records.
                  </p>
                </div>
                <div className="flex items-center gap-space-sm self-start md:self-auto bg-surface-container-lowest px-space-md py-space-xs rounded-xl shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold tracking-tight text-[11px] leading-tight">
                      Official Fiduciary Ledger
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px] leading-none">
                      ISO 20022 Audit Ready • SHA-256 Sealed
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Selection & Statement Period Configuration Card */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Select Clearing Ledger</span>
                  
                  {/* Dual Account Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
                    {/* Card 1: NGN Primary */}
                    <div
                      onClick={() => setSelectedAccount('ngn')}
                      className={`cursor-pointer rounded-xl p-space-md transition-all relative overflow-hidden flex flex-col justify-between gap-space-md ${
                        selectedAccount === 'ngn' ? 'bg-surface-container-low' : 'bg-surface-bright hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold font-code-token text-[14px]">
                            ₦
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-space-xs">
                              <span className="font-headline-sm text-headline-sm text-on-surface leading-snug">NGN Primary Wallet</span>
                              <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${
                                selectedAccount === 'ngn' ? 'bg-secondary/15 text-secondary' : 'bg-surface-container text-on-surface-variant'
                              }`}>
                                {selectedAccount === 'ngn' ? 'Active • Primary' : 'Inactive'}
                              </span>
                            </div>
                            <span className="font-code-token text-body-sm text-on-surface-variant">012 •••• 8492 • Acme Global Nigeria Ltd</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selectedAccount === 'ngn' ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {selectedAccount === 'ngn' ? 'check' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between pt-space-xs">
                        <div className="flex flex-col">
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Available Vault Balance</span>
                          <span className="font-headline-md text-headline-md font-bold text-on-surface">₦8,450,000.00 <span className="font-label-sm text-label-sm text-on-surface-variant">NGN</span></span>
                        </div>
                        <span className="font-code-token text-body-sm text-[11px] text-secondary">NIBSS Realtime Node</span>
                      </div>
                    </div>

                    {/* Card 2: USD Vault */}
                    <div
                      onClick={() => setSelectedAccount('usd')}
                      className={`cursor-pointer rounded-xl p-space-md transition-all relative overflow-hidden flex flex-col justify-between gap-space-md ${
                        selectedAccount === 'usd' ? 'bg-surface-container-low' : 'bg-surface-bright hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-xl bg-inverse-surface text-inverse-on-surface flex items-center justify-center font-bold font-code-token text-[14px]">
                            $
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-space-xs">
                              <span className="font-headline-sm text-headline-sm text-on-surface leading-snug">USD Settlement Vault</span>
                              <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${
                                selectedAccount === 'usd' ? 'bg-secondary/15 text-secondary' : 'bg-surface-container text-on-surface-variant'
                              }`}>
                                {selectedAccount === 'usd' ? 'Active • FDIC Insured' : 'Inactive'}
                              </span>
                            </div>
                            <span className="font-code-token text-body-sm text-on-surface-variant">849 •••• 1039 • Acme Global International Corp</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selectedAccount === 'usd' ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {selectedAccount === 'usd' ? 'check' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between pt-space-xs">
                        <div className="flex flex-col">
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Fedwire Available Vault</span>
                          <span className="font-headline-md text-headline-md font-bold text-on-surface">$3,920.50 <span className="font-label-sm text-label-sm text-on-surface-variant">USD</span></span>
                        </div>
                        <span className="font-code-token text-body-sm text-[11px] text-on-surface-variant">SWIFT / Fedwire Hub</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statement Period Config Row */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
                  <div className="flex flex-col gap-space-xs flex-1">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Statement Period Controls</span>
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <button type="button" className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md">This Month</button>
                      <button type="button" className="px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors">Last Month</button>
                      <button type="button" className="px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors">Last 3 Months</button>
                      <button type="button" className="px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors">Custom Range</button>
                    </div>
                  </div>

                  {/* Date Range Pickers & Primary Action Button */}
                  <div className="flex flex-wrap items-end gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">Start Date (UTC)</label>
                      <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg focus-within:bg-surface-container-lowest shadow-sm">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
                        <input
                          type="text"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-transparent font-code-token text-body-md text-on-surface focus:outline-none w-32"
                        />
                      </div>
                    </div>
                    <div className="flex items-center pb-2 text-on-surface-variant font-label-sm">
                      <span className="material-symbols-outlined text-[16px]">trending_flat</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">End Date (UTC)</label>
                      <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg focus-within:bg-surface-container-lowest shadow-sm">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_month</span>
                        <input
                          type="text"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-transparent font-code-token text-body-md text-on-surface focus:outline-none w-32"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex items-center gap-space-xs px-space-lg py-space-xs rounded-lg bg-primary-container text-on-primary hover:bg-inverse-surface active:scale-[0.99] font-label-md text-label-md shadow-sm transition-all h-[38px]"
                    >
                      <span className="material-symbols-outlined text-[18px] text-secondary-fixed">refresh</span>
                      <span>Generate Statement</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Inline Validation Bar or Error Box */}
                {ledgerState === 'error' ? (
                  <div className="flex flex-col gap-space-xs p-space-md rounded-lg bg-error-container text-on-error-container">
                    <div className="flex items-center gap-space-xs font-label-md text-label-md">
                      <span className="material-symbols-outlined text-[20px] text-error">error</span>
                      <span>Date Range Inversion Error (Code 0x82F4)</span>
                    </div>
                    <p className="font-body-md text-body-md">
                      The selected 'End Date' precedes the 'Start Date' or exceeds the 365-day single query threshold. Please reconfigure the statement parameters to re-run cryptographic ledger reconciliation.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-space-md py-space-xs rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Valid Date Range (31 Days) • Complete On-Rail Audit Trail Available</span>
                    </div>
                    <span className="font-code-token text-body-sm text-[11px] text-on-surface-variant">Period: 2024-10-01T00:00:00Z to 2024-10-31T23:59:59Z</span>
                  </div>
                )}
              </div>

              {/* Conditional Rendering based on ledgerState */}

              {/* 1. LOADING SKELETON */}
              {ledgerState === 'loading' && (
                <div className="flex flex-col gap-space-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-surface-container-lowest p-space-md flex flex-col justify-between animate-pulse">
                        <div className="h-4 w-24 bg-surface-container rounded"></div>
                        <div className="h-7 w-32 bg-surface-container rounded"></div>
                        <div className="h-3 w-28 bg-surface-container rounded"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-64 rounded-xl bg-surface-container-lowest p-space-lg flex flex-col justify-center items-center gap-space-md animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-surface-container"></div>
                    <div className="h-4 w-64 bg-surface-container rounded"></div>
                    <div className="h-3 w-48 bg-surface-container rounded"></div>
                  </div>
                </div>
              )}

              {/* 2. EMPTY STATE */}
              {ledgerState === 'empty' && (
                <div className="flex flex-col items-center justify-center p-space-xl bg-surface-container-lowest rounded-xl shadow-sm text-center gap-space-md">
                  <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px]">manage_search</span>
                  </div>
                  <div className="flex flex-col gap-1 max-w-md">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">No Ledger Entries Recorded</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      There are zero debits or credits matching this account within the chosen timeframe. Expand your range or select an alternate account ledger.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLedgerState('active')}
                    className="px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md"
                  >
                    Reset to Current Month
                  </button>
                </div>
              )}

              {/* 3. ACTIVE STATEMENT VIEW (or Error View acting as active statement with error banner) */}
              {(ledgerState === 'active' || ledgerState === 'error') && (
                <div className="flex flex-col gap-space-lg">
                  {/* 5-Column Statement Summary KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
                    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Opening Balance</span>
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₦5,230,000.00</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Oct 01, 2024, 00:00 UTC</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-on-surface-variant w-1/3"></div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-secondary">Total Inflow (Credits)</span>
                        <span className="material-symbols-outlined text-[18px] text-secondary">arrow_downward</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-bold text-secondary">+₦14,870,000.00</span>
                        <span className="font-body-sm text-body-sm text-secondary text-[11px]">18 Inbound Settlements</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-3/4"></div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Total Outflow (Debits)</span>
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_upward</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">-₦11,650,000.00</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">24 Outbound Remittances</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-inverse-surface w-3/5"></div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Fees &amp; Clearing Toll</span>
                        <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">₦0.00</span>
                        <span className="font-body-sm text-body-sm text-secondary text-[11px]">Zero Network Fee Promotion</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-full"></div>
                      </div>
                    </div>

                    <div className="bg-primary-container text-on-primary rounded-xl p-space-md shadow-md flex flex-col justify-between gap-space-xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-primary-fixed-dim">Closing Ledger Balance</span>
                        <span className="material-symbols-outlined text-[18px] text-secondary-fixed">account_balance_wallet</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-primary">₦8,450,000.00</span>
                        <span className="font-body-sm text-body-sm text-primary-fixed-dim text-[11px]">Reconciled • Oct 31, 23:59 UTC</span>
                      </div>
                      <div className="h-1 w-full bg-inverse-surface rounded-full overflow-hidden">
                        <div className="h-full bg-secondary-fixed w-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Export & Download Action Bar */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-md text-label-md text-on-surface font-semibold">Ref: PB-STMT-202410-NGN</span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-code-token text-[10px]">SHA-256 VERIFIED</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
                          Generated on Oct 25, 2024 at 14:30:19 UTC • Fiduciary Canonical Print
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <button type="button" className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary hover:bg-inverse-surface active:scale-[0.99] font-label-md text-label-md shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px] text-secondary-fixed">picture_as_pdf</span>
                        <span>Download PDF Statement</span>
                      </button>
                      <button type="button" className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors">
                        <span className="material-symbols-outlined text-[18px]">table_view</span>
                        <span>Export CSV</span>
                      </button>
                      <button type="button" className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        <span>Email Statement</span>
                      </button>
                    </div>
                  </div>

                  {/* Statement Transactions Ledger Table */}
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-bright">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-on-surface">Audited Ledger Postings</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant text-[10px]">42 Entries</span>
                      </div>
                      <div className="flex items-center gap-space-sm">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Timezone: UTC (00:00)</span>
                        <button type="button" className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[18px]">filter_list</span>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-body-md text-body-md border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider text-[11px]">
                            <th className="py-space-sm px-space-md font-semibold">Date &amp; Time (UTC)</th>
                            <th className="py-space-sm px-space-md font-semibold">Posting Ref</th>
                            <th className="py-space-sm px-space-md font-semibold">Description / Counterparty</th>
                            <th className="py-space-sm px-space-md font-semibold">Type</th>
                            <th className="py-space-sm px-space-md font-semibold text-right">Money In (CR)</th>
                            <th className="py-space-sm px-space-md font-semibold text-right">Money Out (DR)</th>
                            <th className="py-space-sm px-space-md font-semibold text-right">Running Balance</th>
                            <th className="py-space-sm px-space-md font-semibold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                          {LEDGER_ROWS.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-bright transition-colors">
                              <td className="py-space-sm px-space-md whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-body-md text-body-md text-on-surface font-medium">{row.date}</span>
                                  <span className="font-code-token text-body-sm text-on-surface-variant text-[11px]">{row.time}</span>
                                </div>
                              </td>
                              <td className="py-space-sm px-space-md whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => copyRef(row.ref)}
                                  className="flex items-center gap-1 font-code-token text-body-sm text-on-surface-variant hover:text-secondary group"
                                >
                                  <span>{row.ref}</span>
                                  <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
                                </button>
                              </td>
                              <td className="py-space-sm px-space-md">
                                <div className="flex flex-col">
                                  <span className="text-on-surface font-medium">{row.description}</span>
                                  <span className="text-on-surface-variant text-[11px]">{row.subDescription}</span>
                                </div>
                              </td>
                              <td className="py-space-sm px-space-md whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${row.typeBadgeClass}`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-space-sm px-space-md text-right font-code-token text-secondary font-semibold whitespace-nowrap">
                                {row.moneyIn}
                              </td>
                              <td className={`py-space-sm px-space-md text-right font-code-token whitespace-nowrap ${row.moneyOut !== '—' ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                                {row.moneyOut}
                              </td>
                              <td className="py-space-sm px-space-md text-right font-code-token font-bold text-on-surface whitespace-nowrap">
                                {row.balance}
                              </td>
                              <td className="py-space-sm px-space-md text-center whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${row.statusClass}`}>
                                  <span className="material-symbols-outlined text-[12px]">
                                    {row.statusText === 'Audited' ? 'lock' : 'check_circle'}
                                  </span>{' '}
                                  {row.statusText}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-bright">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Showing <span className="font-semibold text-on-surface">1</span> to <span className="font-semibold text-on-surface">7</span> of <span className="font-semibold text-on-surface">42</span> statement entries
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button" className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40" disabled>
                          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button type="button" className="w-8 h-8 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm">1</button>
                        <button type="button" className="w-8 h-8 rounded-lg text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors">2</button>
                        <button type="button" className="w-8 h-8 rounded-lg text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors">3</button>
                        <span className="px-1 text-on-surface-variant">...</span>
                        <button type="button" className="w-8 h-8 rounded-lg text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors">6</button>
                        <button type="button" className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Generated Statements (Statement Archive) */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Archived Statements</h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Pre-compiled official PDF records cryptographically stored for 7 years.</span>
                  </div>
                  <button type="button" className="flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:underline">
                    <span>View Archive Vault</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {ARCHIVED_STATEMENTS.map((arch) => (
                    <div key={arch.id} className="bg-surface-bright rounded-xl p-space-md flex flex-col justify-between gap-space-md hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-xs">
                          <div className="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md text-on-surface font-semibold">{arch.title}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">{arch.subtitle}</span>
                          </div>
                        </div>
                        <span className="font-code-token text-body-sm text-on-surface-variant text-[11px]">{arch.fileSize}</span>
                      </div>
                      <div className="flex items-center justify-between pt-space-xs">
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">{arch.generatedDate}</span>
                        <div className="flex items-center gap-space-xs">
                          <button type="button" className="px-space-xs py-1 rounded text-secondary hover:bg-surface-container font-label-sm text-label-sm transition-colors">
                            View
                          </button>
                          <button type="button" className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors">
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fiduciary & Legal Compliance Notice Banner */}
              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md shadow-sm">
                <div className="flex items-start sm:items-center gap-space-md">
                  <span className="material-symbols-outlined text-[24px] text-secondary">verified_user</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-4xl">
                    <strong className="font-semibold text-on-surface">Fiduciary Record Guarantee:</strong> This statement is an official electronic record of financial transactions executed through PayBridge Clearing Nodes. All postings are cryptographically sealed with HSM signature <span className="font-code-token font-medium text-on-surface">PB-SIG-8841-A9</span> and conform to CBN / SEC regulatory reporting standards.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs shrink-0">
                  <span className="font-label-sm text-label-sm text-secondary font-code-token text-[11px]">100% AUDIT RECONCILED</span>
                </div>
              </div>

            </div>
          </div>
        </div>
    </div>
  );
}
import React, { useState } from 'react';

export default function ProfileKycPage() {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'personal' | 'kyc' | 'security' | 'compliance'>('personal');
  const [simulationState, setSimulationState] = useState<'active' | 'pending' | 'action' | 'saving'>('active');

  // Personal form fields state
  const [firstName, setFirstName] = useState<string>('Morgan');
  const [lastName, setLastName] = useState<string>('Reed');
  const [businessTitle, setBusinessTitle] = useState<string>('Chief Executive / Managing Director');
  const [phone, setPhone] = useState<string>('+234 803 555 4819');
  const [address, setAddress] = useState<string>('14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria');

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Toast / Status state for save action
  const [saveButtonText, setSaveButtonText] = useState<string>('Save Changes');
  const [saveButtonIcon, setSaveButtonIcon] = useState<string>('check');

  // Password fields state
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');

  // Handlers
  const handleCopyId = () => {
    navigator.clipboard?.writeText('USR-PB-84029');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSimulationState('saving');
    setSaveButtonText('Encrypting & Syncing...');
    setSaveButtonIcon('sync');

    setTimeout(() => {
      setSaveButtonText('Synced to Ledger');
      setSaveButtonIcon('done_all');
      setSimulationState('active');
    }, 1500);
  };

  const simulateState = (state: 'active' | 'pending' | 'action' | 'saving') => {
    setSimulationState(state);
    if (state === 'saving') {
      setSaveButtonText('Encrypting & Syncing...');
      setTimeout(() => {
        setSaveButtonText('Synced to Ledger');
      }, 1500);
    }
  };

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
        <div className="w-full bg-surface min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col w-full">
            
            {/* Simulation Control Toolbar */}
            <div className="px-gutter py-space-sm bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Institutional Sandbox:</span>
                <span className="font-body-sm text-body-sm text-on-surface">Previewing Sovereign Ledger Verification Engine</span>
              </div>
              <div className="flex items-center gap-space-xs flex-wrap">
                <button type="button" className="px-space-sm py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors shadow-sm" onClick={() => simulateState('active')}>
                  Active Tier 2
                </button>
                <button type="button" className="px-space-sm py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors shadow-sm" onClick={() => simulateState('pending')}>
                  Pending Review
                </button>
                <button type="button" className="px-space-sm py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors shadow-sm" onClick={() => simulateState('action')}>
                  Action Required
                </button>
                <button type="button" className="px-space-sm py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors shadow-sm" onClick={() => simulateState('saving')}>
                  Simulate Save
                </button>
              </div>
            </div>

            <div className="px-gutter py-space-lg flex flex-col gap-space-lg max-w-7xl mx-auto w-full">
              
              {/* Breadcrumb & Top Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                    <span>Dashboard</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-on-surface font-label-md">Profile &amp; Verification</span>
                  </div>
                  <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    Profile &amp; Verification
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Manage your personal information, corporate identity verification, and security credentials.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-xs">
                  {simulationState === 'active' && (
                    <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span>Tier 2 Verified (Enterprise)</span>
                    </div>
                  )}
                  {simulationState === 'pending' && (
                    <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                      <span>Verification Pending Review</span>
                    </div>
                  )}
                  {simulationState === 'action' && (
                    <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                      <span>Action Required (Expiring Docs)</span>
                    </div>
                  )}
                  {simulationState === 'saving' && (
                    <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                      <span>Syncing State...</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
                    <span>Security: Enhanced (2FA Active)</span>
                  </div>
                </div>
              </div>

              {/* Alert / State Box */}
              {simulationState === 'pending' && (
                <div className="p-space-md rounded-xl bg-surface-container-high flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">hourglass_top</span>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">Institutional KYB Verification Underwriting Active</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Auditors are cross-referencing corporate registry documentation with Apex Clearing standards. Expected turnaround &lt; 4 hours.</p>
                  </div>
                </div>
              )}
              {simulationState === 'action' && (
                <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-error text-[20px] mt-0.5">warning</span>
                  <div>
                    <p className="font-label-md text-label-md text-on-error-container">Corporate Board Resolution Expiring in 5 Days</p>
                    <p className="font-body-sm text-body-sm text-on-error-container">Submit a fresh 2025 Board of Directors Mandate to retain Tier 2 SWIFT &amp; NIP bulk disbursement limits.</p>
                  </div>
                </div>
              )}

              {/* Top Profile Summary Card (Corporate Identity Banner) */}
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-md">
                      MR
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                        Morgan Reed
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                        Account Signatory
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Managing Director • Acme Global Ltd <span className="font-code-token text-[12px] text-on-surface-variant/80 font-normal">(RC-1094829)</span>
                    </p>
                    <div className="flex items-center gap-space-sm pt-0.5 text-on-surface-variant font-body-sm text-body-sm">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-secondary">corporate_fare</span> Institutional Corp
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-secondary">shield</span> Level: Tier 2 (Corporate Primary)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Metadata Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md p-space-md rounded-lg bg-surface-container-low shrink-0">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">User ID</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-code-token text-[13px] text-on-surface font-medium">USR-PB-84029</span>
                      <button
                        type="button"
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                        onClick={handleCopyId}
                        title="Copy Identifier"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedId ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Primary Email</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[130px]">m.reed@acmeglobal.io</span>
                      <span className="material-symbols-outlined text-[14px] text-secondary" title="Domain Verified">check_circle</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Registered</span>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">Jan 14, 2024</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">KYC Status</span>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Tier 2 Full
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Switcher Tabs */}
              <div className="flex items-center gap-space-xs p-1.5 rounded-xl bg-surface-container-low overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                    activeTab === 'personal' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Personal &amp; Entity Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kyc')}
                  className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                    activeTab === 'kyc' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Identity Verification (KYC / KYB)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                    activeTab === 'security' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Security &amp; Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('compliance')}
                  className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                    activeTab === 'compliance' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Compliance &amp; Limits
                </button>
              </div>

              {/* TAB 1: PERSONAL & ENTITY PROFILE */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg w-full">
                  <div className="lg:col-span-8 flex flex-col gap-space-lg">
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                      <div className="flex items-center justify-between pb-space-sm">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Institutional Signatory Details
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Official contact records registered for fiduciary authorizations and cross-border disbursements.
                          </p>
                        </div>
                        <span className="px-space-sm py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                          Fiduciary ID
                        </span>
                      </div>

                      <div className="p-space-md rounded-lg bg-surface-container-low flex items-center gap-space-sm">
                        <span className="material-symbols-outlined text-[20px] text-secondary">info</span>
                        <span className="font-body-sm text-body-sm text-on-surface">
                          All changes to primary business contact details require 2FA re-authorization before clearing.
                        </span>
                      </div>

                      <form onSubmit={handleSaveProfile} className="flex flex-col gap-space-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">First Name</label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">Last Name</label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">Business Title / Mandate</label>
                            <input
                              type="text"
                              value={businessTitle}
                              onChange={(e) => setBusinessTitle(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="font-label-sm text-label-sm text-on-surface-variant">Work Email Address</label>
                              <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
                                <span className="material-symbols-outlined text-[13px]">lock</span> Managed via Corporate SSO
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="email"
                                readOnly
                                value="m.reed@acmeglobal.io"
                                className="w-full bg-surface-container-low text-on-surface-variant font-body-md text-body-md px-space-md py-2.5 rounded-lg cursor-not-allowed select-all"
                              />
                              <span className="material-symbols-outlined text-[16px] text-secondary absolute right-3 top-3">verified</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="font-label-sm text-label-sm text-on-surface-variant">Primary Phone (SMS 2FA)</label>
                              <span className="font-body-sm text-[11px] text-secondary">Verified</span>
                            </div>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                            <span className="font-body-sm text-[11px] text-on-surface-variant">Changes trigger automated SMS challenge to old device.</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="font-label-sm text-label-sm text-on-surface-variant">Date of Birth (Sanction Vault)</label>
                              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">shield</span>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                readOnly
                                value="•• / •• / 1982"
                                className="w-full bg-surface-container-low text-on-surface-variant font-code-token text-[13px] px-space-md py-2.5 rounded-lg cursor-not-allowed"
                              />
                              <span className="font-body-sm text-[11px] text-on-surface-variant absolute right-3 top-3">Locked</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm text-on-surface-variant">Registered Office / Residential Address</label>
                          <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                          <button type="button" className="px-space-md py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                            Cancel / Revert
                          </button>
                          <button
                            type="submit"
                            className="px-space-md py-2 rounded-lg font-label-md text-label-md bg-primary-container text-on-primary hover:bg-inverse-surface transition-all shadow flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">{saveButtonIcon}</span>
                            <span>{saveButtonText}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Corporate Entity Information Panel */}
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Corporate Entity Profile</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Statutory enterprise registration details validated via Corporate Affairs Commission.</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-label-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Active Legal Entity
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
                        <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Registered Business Name</span>
                          <span className="font-label-md text-label-md text-on-surface mt-1">Acme Global Technologies Ltd</span>
                        </div>
                        <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Registration / RC Number</span>
                          <span className="font-code-token text-[13px] text-on-surface font-medium mt-1">RC-1094829</span>
                        </div>
                        <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Tax ID (FIRS TIN)</span>
                          <span className="font-code-token text-[13px] text-on-surface font-medium mt-1">22940291-0001</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Security & Fiduciary Status Summary */}
                  <div className="lg:col-span-4 flex flex-col gap-space-lg">
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                      <div className="flex items-center justify-between">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Authentication Vault</h3>
                        <span className="material-symbols-outlined text-secondary text-[22px]">lock_reset</span>
                      </div>
                      <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md text-on-surface">Two-Factor Auth (TOTP)</span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/40 text-on-secondary-container font-label-sm text-[11px] font-semibold">Enabled</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Authenticator app configured with Google Authenticator / 1Password.
                        </p>
                        <div className="pt-2">
                          <button type="button" onClick={() => setActiveTab('security')} className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1">
                            Manage 2FA Settings <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md text-on-surface">Corporate Password</span>
                          <span className="font-body-sm text-[11px] text-on-surface-variant">Updated 42d ago</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Next mandatory institutional rotation in 48 days.
                        </p>
                        <div className="pt-2">
                          <button type="button" onClick={() => setActiveTab('security')} className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1">
                            Change Password <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Compliance Standing</h3>
                      <div className="flex flex-col gap-space-sm">
                        <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">verified</span>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface">AML / PEP Automated Screening</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">Passed • OFAC, EU &amp; CBN sanction lists clean.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">currency_exchange</span>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface">Remittance Clearance</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">Authorized corridors: USD, GBP, EUR, KES, GHS, NGN.</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">Institutional Fiduciary Officer</span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">compliance@paybridge.io</span>
                        </div>
                        <a href="mailto:compliance@paybridge.io" className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface text-on-surface shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">mail</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: IDENTITY VERIFICATION (KYC / KYB) */}
              {activeTab === 'kyc' && (
                <div className="flex flex-col gap-space-lg w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
                      <div className="flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Standard</span>
                          <span className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                          </span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Tier 1: Basic</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Personal identity check &amp; primary mobile phone validation.
                        </p>
                        <div className="mt-space-sm p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                          <span className="font-label-sm text-label-sm text-on-surface">Daily Limit: $10,000 / ₦15,000,000</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Cleared on Jan 14, 2024</span>
                        </div>
                      </div>
                      <button type="button" className="w-full py-2 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface-variant cursor-not-allowed" disabled>
                        Completed
                      </button>
                    </div>

                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-secondary/10 to-transparent rounded-bl-full pointer-events-none"></div>
                      <div className="flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Active Current</span>
                          <span className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[16px]">verified</span> Active
                          </span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Tier 2: Corporate KYB</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Full corporate registrar documentation, proof of address, and beneficial ownership audit.
                        </p>
                        <div className="mt-space-sm p-space-sm rounded-lg bg-secondary-fixed/20 flex flex-col gap-1">
                          <span className="font-label-sm text-label-sm text-on-secondary-container">Daily Limit: $50,000 / ₦75,000,000</span>
                          <span className="font-body-sm text-body-sm text-on-secondary-container text-[11px]">Fedwire &amp; NIP Real-Time Clearing Enabled</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                        <span className="font-label-sm text-label-sm text-secondary font-medium">Underwriting Approved</span>
                        <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                      </div>
                    </div>

                    <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
                      <div className="flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Institutional OTC</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Available to Request</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Tier 3: Wholesale</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Unlimited OTC corridors, dedicated FX liquidity lines, and high-frequency settlement channels.
                        </p>
                        <div className="mt-space-sm p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                          <span className="font-label-sm text-label-sm text-on-surface">Daily Limit: Unlimited Settlement</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Requires audited IFRS financials</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => simulateState('pending')}
                        className="w-full py-2 rounded-lg bg-primary-container text-on-primary hover:bg-inverse-surface font-label-md text-label-md transition-colors shadow"
                      >
                        Request Tier 3 Elevation
                      </button>
                    </div>
                  </div>

                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Institutional Document Vault</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Encrypted cryptographic archive of validated compliance documents.</p>
                      </div>
                      <button type="button" className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors self-start sm:self-auto">
                        <span className="material-symbols-outlined text-[16px]">upload_file</span> Upload Update
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-md">
                        <div className="flex flex-col gap-space-xs">
                          <div className="flex items-center justify-between">
                            <span className="material-symbols-outlined text-secondary text-[24px]">badge</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-[11px]">
                              Verified
                            </span>
                          </div>
                          <span className="font-label-md text-label-md text-on-surface font-semibold">Government Passport</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">International Passport (Federal Republic of Nigeria)</span>
                          <div className="pt-space-xs">
                            <span className="font-code-token text-[12px] text-on-surface-variant">Ref: A092••••41</span>
                            <p className="font-body-sm text-[11px] text-on-surface-variant">Valid through Nov 2028</p>
                          </div>
                        </div>
                        <button type="button" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1 self-start">
                          View Audit Token <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      </div>

                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-md">
                        <div className="flex flex-col gap-space-xs">
                          <div className="flex items-center justify-between">
                            <span className="material-symbols-outlined text-secondary text-[24px]">description</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-[11px]">
                              Verified
                            </span>
                          </div>
                          <span className="font-label-md text-label-md text-on-surface font-semibold">CAC Certificate &amp; Mandate</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Certificate of Incorporation &amp; Authorized Signatory Resolution</span>
                          <div className="pt-space-xs">
                            <span className="font-code-token text-[12px] text-on-surface-variant">Ref: CAC/IT/88490</span>
                            <p className="font-body-sm text-[11px] text-on-surface-variant">Validated Feb 2024</p>
                          </div>
                        </div>
                        <button type="button" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1 self-start">
                          View Audit Token <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      </div>

                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-md">
                        <div className="flex flex-col gap-space-xs">
                          <div className="flex items-center justify-between">
                            <span className="material-symbols-outlined text-secondary text-[24px]">home_pin</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-[11px]">
                              Verified
                            </span>
                          </div>
                          <span className="font-label-md text-label-md text-on-surface font-semibold">Proof of Corporate Address</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Commercial Headquarters Lease &amp; Bank Utility Statement</span>
                          <div className="pt-space-xs">
                            <span className="font-code-token text-[12px] text-on-surface-variant">Ref: LEK-88102-AD</span>
                            <p className="font-body-sm text-[11px] text-on-surface-variant">Validated Oct 2024</p>
                          </div>
                        </div>
                        <button type="button" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1 self-start">
                          View Audit Token <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY & SESSIONS */}
              {activeTab === 'security' && (
                <div className="flex flex-col gap-space-lg w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                    <div className="lg:col-span-6 flex flex-col gap-space-lg">
                      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Credential Configuration</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Update corporate authentication passphrase adhering to PCI-DSS Level 1 specifications.</p>
                        <form onSubmit={(e) => { e.preventDefault(); simulateState('saving'); }} className="flex flex-col gap-space-md pt-space-xs">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">Current Corporate Password</label>
                            <input
                              type="password"
                              value={currentPass}
                              onChange={(e) => setCurrentPass(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                              placeholder="••••••••••••••••"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">New Corporate Password</label>
                            <input
                              type="password"
                              value={newPass}
                              onChange={(e) => setNewPass(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                              placeholder="Minimum 14 characters + symbol"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">Confirm New Password</label>
                            <input
                              type="password"
                              value={confirmPass}
                              onChange={(e) => setConfirmPass(e.target.value)}
                              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                              placeholder="Re-enter new password"
                            />
                          </div>
                          <div className="pt-space-xs">
                            <button type="submit" className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary hover:bg-inverse-surface font-label-md text-label-md transition-all shadow">
                              Update Password
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                        <div className="flex items-center justify-between">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Hardware Security &amp; FIDO2</h3>
                          <span className="material-symbols-outlined text-secondary text-[22px]">vpn_key</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Register physical YubiKeys or Apple TouchID / Windows Hello hardware passkeys for zero-trust authorization.
                        </p>
                        <div className="flex items-center justify-between p-space-md rounded-lg bg-surface-container-low">
                          <div className="flex items-center gap-space-sm">
                            <span className="material-symbols-outlined text-on-surface text-[20px]">fingerprint</span>
                            <div>
                              <p className="font-label-md text-label-md text-on-surface">MacBook Pro TouchID</p>
                              <p className="font-body-sm text-[11px] text-on-surface-variant">Added Sep 2024 • FIDO2 / WebAuthn</p>
                            </div>
                          </div>
                          <button type="button" className="font-label-sm text-label-sm text-error hover:underline">Revoke</button>
                        </div>
                        <button type="button" className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">add_circle</span> Register New Hardware Key
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-6 flex flex-col gap-space-lg">
                      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Active Authorized Sessions</h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time devices authenticated into Acme Global Ltd treasury console.</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                        </div>
                        <div className="flex flex-col gap-space-sm pt-space-xs">
                          <div className="p-space-md rounded-xl bg-surface-container-low flex items-start justify-between gap-space-md">
                            <div className="flex items-start gap-space-sm">
                              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">laptop_mac</span>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-label-md text-label-md text-on-surface font-semibold">Chrome on macOS Sequoia</span>
                                  <span className="px-1.5 py-0.5 rounded bg-secondary-fixed/30 text-on-secondary-container font-label-sm text-[10px] font-bold">CURRENT</span>
                                </div>
                                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Lagos, Nigeria • IP: 102.89.•••.12</span>
                                <span className="font-body-sm text-[11px] text-secondary mt-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Active Right Now
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-space-md rounded-xl bg-surface-container-low flex items-start justify-between gap-space-md">
                            <div className="flex items-start gap-space-sm">
                              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface-variant shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md text-on-surface font-semibold">PayBridge iOS App v2.4</span>
                                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">iPhone 15 Pro • Victoria Island, Lagos</span>
                                <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">Last active 2 hours ago</span>
                              </div>
                            </div>
                            <button type="button" className="font-label-sm text-label-sm text-error hover:underline">Revoke</button>
                          </div>
                        </div>
                        <div className="pt-space-xs">
                          <button
                            type="button"
                            onClick={() => alert('All remote sessions have been revoked.')}
                            className="w-full py-2.5 rounded-lg bg-surface-container-low hover:bg-error-container text-error font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">logout</span> Sign Out All Other Sessions
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: COMPLIANCE & LIMITS */}
              {activeTab === 'compliance' && (
                <div className="flex flex-col gap-space-lg w-full">
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Institutional Operational Limits</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Tier-governed transaction ceilings allocated by liquidity partners and central banking guidelines.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md pt-space-xs">
                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Daily Outbound FX Limit</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">$50,000.00</span>
                        <span className="font-body-sm text-[11px] text-secondary font-medium">42% utilized today</span>
                        <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-secondary h-full rounded-full" style={{ width: '42%' }}></div>
                        </div>
                      </div>
                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Daily NGN Remittance Limit</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">₦75,000,000</span>
                        <span className="font-body-sm text-[11px] text-secondary font-medium">18% utilized today</span>
                        <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-secondary h-full rounded-full" style={{ width: '18%' }}></div>
                        </div>
                      </div>
                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Per Transaction Cap</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">$25,000.00</span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">Single-wire threshold</span>
                      </div>
                      <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Wholesale Elevation</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">Tier 3</span>
                        <span className="font-body-sm text-[11px] text-secondary font-medium">Ready for review</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
    </div>
  );
}
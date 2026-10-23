import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../Icon'
import { navItems } from './navigation'

interface Props { mobileNavOpen: boolean; setMobileNavOpen: (open: boolean) => void; busy: boolean; signOut: (all: boolean) => Promise<void> }
export default function Sidebar({ mobileNavOpen, setMobileNavOpen, busy, signOut }: Props) {
 const { pathname } = useLocation()
 const isOverview = pathname === '/dashboard'
 return (
      <aside id="dashboard-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between overflow-y-auto ${isOverview ? 'bg-[#102137] text-slate-200 shadow-xl' : 'bg-primary-container text-on-primary-fixed shadow-[0_1px_8px_rgba(0,0,0,0.04)]'} transition-transform md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0 visible' : '-translate-x-full invisible md:visible'
        }`}
      >
        <div>
          <div className={`flex h-16 items-center gap-3 px-6 ${isOverview ? 'border-b border-white/10' : ''}`}>
            <div className={`flex items-center justify-center text-white ${isOverview ? 'h-9 w-9 rounded-xl bg-teal-500' : 'h-8 w-8 rounded-lg bg-secondary'}`}>
              <Icon name="swap_horiz" className="text-2xl" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white">
                PayBridge
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                {isOverview ? 'Cross-border payments' : 'Institutional FX'}
              </div>
            </div>
            <button
              className="ml-auto rounded p-1 text-slate-300 md:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="px-6 pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isOverview ? 'Workspace' : 'Navigation'}
          </div>

          <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) => isOverview ? `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white ring-1 ring-white/5'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                  }` : `flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-colors ${isActive ? 'bg-inverse-surface text-on-primary' : 'text-primary-fixed-dim hover:bg-inverse-surface hover:text-on-primary'}`}
                >
                  {({ isActive }) => <><Icon name={item.icon} className={`text-xl ${isOverview ? (isActive ? 'text-teal-300' : 'text-slate-400') : ''}`} />{item.label}</>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              {isOverview ? 'Live environment' : 'Live Clearing'}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {isOverview ? 'Balances and transactions load securely from your backend services.' : 'Bank-grade Encrypted'}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Icon name="logout" className="text-xl" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut(true)}
            className="w-full px-3 text-left text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50"
          >
            Sign out all sessions
          </button>
        </div>
      </aside>


 )
}

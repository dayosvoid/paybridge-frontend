import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Icon } from '../Icon'
import { navItems } from './navigation'
export default function DashboardHeader({ mobileNavOpen, setMobileNavOpen }: { mobileNavOpen: boolean; setMobileNavOpen: (open: boolean) => void }) {
 const { user } = useAuth()
 const { pathname } = useLocation()
 const accountNumber = user?.accountNumber
 if (pathname !== '/dashboard') return (        <header className="sticky top-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 w-full px-4 md:px-gutter flex items-center justify-between gap-3">
<button type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} aria-controls="dashboard-navigation" onClick={() => setMobileNavOpen(true)} className="p-2 md:hidden"><Icon name="menu" /></button>
            <div className="hidden xl:flex items-center gap-space-lg">
              <div className="relative flex items-center w-full max-w-80">
                <span className="material-symbols-outlined absolute left-space-md text-[18px] text-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md pl-10 pr-space-md py-space-xs rounded-lg placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-secondary"
                  placeholder="Search transactions, recipients, currencies..."
                />
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-low">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                <span className="font-label-sm text-label-sm text-secondary">USD/EUR 1.0842</span>
              </div>
              <button
                type="button"
                className="relative p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full"></span>
              </button>
              <button
                type="button"
                className="p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">help_outline</span>
              </button>
              <div className="flex items-center gap-space-sm pl-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-label-md text-label-md text-on-surface leading-tight">{user?.fullName || user?.email || 'User'}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-none">
                    {user?.email || user?.accountNumber || 'Customer workspace'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
              </div>
            </div>
          </div>
        </header>

)
 return (        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="dashboard-navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <Icon name="menu" className="text-2xl" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">
                Customer workspace
              </p>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {navItems.find(item => item.path === pathname)?.label ?? 'Customer workspace'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold text-slate-900">
                {user?.fullName || user?.email || 'User'}
              </div>
              <div className="text-xs text-slate-500">
                Account: {accountNumber ?? '—'}
              </div>
            </div>
          </div>
        </header>

)
}

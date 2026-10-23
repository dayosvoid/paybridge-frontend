import { Link, Outlet } from 'react-router-dom'
import { USE_MOCK } from '../config'

/** The frame around every page. Navigation links appear here as each slice adds its screen. */
export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight text-indigo-700">
            PayBridge
          </Link>
          <span
            className={
              'rounded-full px-3 py-1 text-xs font-medium ' +
              (USE_MOCK ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
            }
          >
            {USE_MOCK ? 'Mock API' : 'Live API'}
          </span>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-xs text-slate-500">PayBridge demo</footer>
    </div>
  )
}

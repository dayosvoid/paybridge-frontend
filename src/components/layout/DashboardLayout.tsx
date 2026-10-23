import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, logoutAll } from '../../auth/session'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'
export default function DashboardLayout() {
 const navigate = useNavigate()
 const location = useLocation()
 const [busy, setBusy] = useState(false)
 const [mobileNavOpen, setMobileNavOpen] = useState(false)
 const shell = useRef<HTMLDivElement>(null)
 useEffect(() => { setMobileNavOpen(false) }, [location.pathname])
 useEffect(() => {
   if (!mobileNavOpen) return
   const previous = document.activeElement as HTMLElement | null
   const closeButton = shell.current?.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')
   closeButton?.focus()
   const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileNavOpen(false) }
   document.addEventListener('keydown', onKey)
   return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
 }, [mobileNavOpen])
  async function signOut(all: boolean) {
    setBusy(true)

    try {
      if (all) {
        await logoutAll()
      } else {
        await logout()
      }
    } catch {
      // Session utilities clear local credentials even when the server fails.
    } finally {
      navigate('/login', { replace: true })
      setBusy(false)
    }
  }


 return <div ref={shell} className="min-h-screen bg-slate-50 text-slate-900">
 <Sidebar mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} busy={busy} signOut={signOut} />
 {mobileNavOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" onClick={() => setMobileNavOpen(false)} type="button" />}
 <div className="min-h-screen md:pl-64">
 <DashboardHeader mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} />
 <main className="min-w-0"><Outlet /></main>
 </div>
 </div>
}

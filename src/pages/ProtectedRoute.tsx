import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
export default function ProtectedRoute() {
  const session = useAuth()
  if (!session.initialized) return <p role="status" className="py-12 text-center text-sm text-slate-600">Restoring your session…</p>
  return session.authenticated ? <Outlet /> : <Navigate to="/login" replace />
}

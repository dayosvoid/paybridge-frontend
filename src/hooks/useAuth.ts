import { useEffect, useState } from 'react'
import { getSession, restoreSession, subscribeSession } from '../auth/session'

export function useAuth() {
  const [session, setSession] = useState(getSession)
  useEffect(() => {
    const unsubscribe = subscribeSession(() => setSession(getSession()))
    void restoreSession()
    setSession(getSession())
    return () => { unsubscribe() }
  }, [])
  return session
}

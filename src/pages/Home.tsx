import { useState } from 'react'
import { ApiError, apiRequest } from '../api/client'
import { API_BASE_URL, USE_MOCK } from '../config'

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; text: string }
  | { state: 'down'; text: string }

/** Placeholder landing page. It proves the app, the API client and the proxy/mock are wired together. */
export default function Home() {
  const [check, setCheck] = useState<Check>({ state: 'idle' })

  async function checkApi() {
    setCheck({ state: 'checking' })
    try {
      // Not signed in, so a working API answers 401. Anything else, or no answer, is worth knowing.
      await apiRequest('/auth/me', { auth: false })
      setCheck({ state: 'ok', text: 'The API answered.' })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setCheck({ state: 'ok', text: 'The API is reachable (it answered 401 because nobody is signed in).' })
      } else if (e instanceof ApiError && e.status === 0) {
        setCheck({ state: 'down', text: e.message })
      } else if (e instanceof ApiError) {
        setCheck({ state: 'down', text: `The API answered ${e.status}: ${e.message}` })
      } else {
        setCheck({ state: 'down', text: 'Something unexpected went wrong.' })
      }
    }
  }

  return (
    <section className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-bold tracking-tight">PayBridge</h1>
      <p className="mt-2 text-slate-600">Send money, hold naira and dollars, and convert between them.</p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <h2 className="font-semibold">Setup check</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Mode</dt>
          <dd>{USE_MOCK ? 'Mock API (no backend needed)' : 'Real backend'}</dd>
          <dt className="text-slate-500">API base</dt>
          <dd className="font-mono">{API_BASE_URL}</dd>
        </dl>

        <button
          type="button"
          onClick={checkApi}
          disabled={check.state === 'checking'}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {check.state === 'checking' ? 'Checking…' : 'Check the API'}
        </button>

        {check.state === 'ok' && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {check.text}
          </p>
        )}
        {check.state === 'down' && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {check.text}
          </p>
        )}
      </div>
    </section>
  )
}

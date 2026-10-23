import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the start page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'PayBridge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check the API' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown addresses', () => {
    renderAt('/nowhere')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the login form on the standalone login route', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Sign in to PayBridge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows the registration form on the standalone register route', () => {
    renderAt('/register')
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('says the API is reachable when it answers 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized', message: 'x' }), { status: 401 })),
    )
    renderAt('/')

    fireEvent.click(screen.getByRole('button', { name: 'Check the API' }))

    expect(await screen.findByRole('status')).toHaveTextContent('reachable')
  })

  it('says so when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    renderAt('/')

    fireEvent.click(screen.getByRole('button', { name: 'Check the API' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })
})

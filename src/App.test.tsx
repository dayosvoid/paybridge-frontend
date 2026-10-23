import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from './App'
import { resetSessionForTests } from './auth/session'

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  )
}

beforeEach(resetSessionForTests)
afterEach(() => {
  cleanup()
  resetSessionForTests()
  vi.unstubAllGlobals()
})

describe('App routing', () => {
  it('redirects the homepage to the standalone login page', async () => {
    const { container } = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Sign in to PayBridge' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/login$/)
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check the API' })).toBeNull()
    expect(container.querySelector('#dashboard-navigation')).toBeNull()
  })

  it('shows a not-found page for unknown addresses', () => {
    renderAt('/nowhere')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/nowhere$/)
  })

  it('shows the login form on the standalone login route', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Sign in to PayBridge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/login$/)
  })

  it('shows the registration form on the standalone register route', () => {
    renderAt('/register')
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/register$/)
  })

  it.each([
    '/dashboard', '/transfers', '/accounts', '/fx', '/remittances',
    '/transactions', '/statements', '/profile', '/transfer', '/account',
  ])('redirects unauthenticated visitors from %s to login', async path => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = renderAt(path)
    expect(await screen.findByRole('heading', { name: 'Sign in to PayBridge' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/login$/)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(container.querySelector('#dashboard-navigation')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

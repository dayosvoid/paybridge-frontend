import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from './App'
import { getSession, resetSessionForTests } from './auth/session'
import type { TokenResponse } from './api/types'

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

const tokens: TokenResponse = {
  accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer',
  expiresInSeconds: 300, refreshExpiresInSeconds: 3600,
  user: { id: 1, fullName: 'New Customer', email: 'new@example.com', role: 'CUSTOMER', accountNumber: '0123456789' },
}

beforeEach(resetSessionForTests)
afterEach(() => {
  cleanup()
  resetSessionForTests()
  vi.unstubAllGlobals()
})

describe('authentication to dashboard navigation with real session subscriptions', () => {
  it.each([
    ['/login', '0123456789'], ['/register', '0123456789'],
    ['/login', null], ['/register', null],
  ])('mounts the sidebar after submitting %s with account number %s', async (path, accountNumber) => {
    const response = { ...tokens, user: { ...tokens.user, accountNumber } }
    const requests: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      requests.push(url)
      if (url.endsWith('/auth/register')) return new Response(JSON.stringify(response.user), { status: 201 })
      if (url.endsWith('/auth/login')) return new Response(JSON.stringify(response), { status: 200 })
      // The shell must not wait for balances, transactions, or profile requests.
      return new Promise<Response>(() => {})
    }))

    const { container } = render(<StrictMode><MemoryRouter initialEntries={[path]}><App /><CurrentPath /></MemoryRouter></StrictMode>)
    expect(container.querySelector('#dashboard-navigation')).toBeNull()
    if (path === '/register') fireEvent.change(screen.getByLabelText('Full name'), { target: { value: tokens.user.fullName } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: tokens.user.email } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: path === '/register' ? 'Create account' : 'Sign in' }))

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/dashboard'))
    expect(getSession().authenticated).toBe(true)
    const sidebar = container.querySelector('#dashboard-navigation')
    expect(sidebar).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByText('New Customer')).toBeInTheDocument()
    expect(requests.some(url => url.endsWith('/auth/login'))).toBe(true)
    if (path === '/register') expect(requests.filter(url => url.includes('/auth/'))).toEqual(['/api/auth/register', '/api/auth/login'])
    if (accountNumber) {
      // The shell commits before the page's data-fetching effect runs.
      await waitFor(() => expect(requests.some(url => url.includes('/balances'))).toBe(true))
      expect(await screen.findByText('Loading account data')).toBeInTheDocument()
    } else {
      expect((await screen.findAllByText('No account is associated with this customer.')).length).toBeGreaterThan(0)
      expect(requests.some(url => url.includes('/balances'))).toBe(false)
    }
  })
})

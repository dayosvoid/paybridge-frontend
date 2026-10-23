import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const auth = vi.hoisted(() => ({ authenticated: true }))
const session = vi.hoisted(() => ({ logout: vi.fn(), logoutAll: vi.fn() }))
vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({
  initialized: true, authenticated: auth.authenticated,
  user: { fullName: 'Test Customer', email: 'customer@example.com' },
}) }))
vi.mock('./auth/session', () => session)

const routes = ['/dashboard', '/accounts', '/transfers', '/fx', '/remittances', '/transactions', '/statements', '/profile']
function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}
beforeEach(() => {
  auth.authenticated = true
  session.logout.mockReset().mockResolvedValue(undefined)
  session.logoutAll.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('shared authenticated workspace', () => {
  it.each(routes)('renders one shell and the active navigation for %s', path => {
    const { container } = renderAt(path)
    expect(container.querySelectorAll('aside')).toHaveLength(1)
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('main')).toHaveLength(1)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getAllByRole('link')).toHaveLength(8)
    expect(nav.querySelector('[aria-current="page"]')).toHaveAttribute('href', path)
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
  })

  it.each(routes)('protects %s', async path => {
    auth.authenticated = false
    const { container } = renderAt(path)
    expect(await screen.findByRole('heading', { name: 'Sign in to PayBridge' })).toBeInTheDocument()
    expect(container.querySelector('#dashboard-navigation')).toBeNull()
  })

  it.each(['/login', '/register', '/', '/unknown'])('keeps %s outside the workspace', path => {
    auth.authenticated = false
    const { container } = renderAt(path)
    expect(container.querySelector('#dashboard-navigation')).toBeNull()
  })

  it.each([['/account', '/accounts'], ['/transfer', '/transfers']])('redirects %s to %s', (oldPath, path) => {
    renderAt(oldPath)
    expect(screen.getByRole('navigation', { name: 'Main navigation' }).querySelector('[aria-current="page"]')).toHaveAttribute('href', path)
  })

  it('keeps the sidebar mounted and closes mobile navigation on selection, overlay, close and Escape', () => {
    renderAt('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    open()
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(nav).getByRole('link', { name: /Accounts/ }))
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBe(nav)
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).toBeNull()
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation overlay' }))
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).toBeNull()
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }))
    expect(screen.queryByRole('button', { name: 'Close navigation overlay' })).toBeNull()
  })

  it.each([false, true])('calls the session logout action (all sessions: %s)', async all => {
    renderAt('/accounts')
    fireEvent.click(screen.getByRole('button', { name: all ? 'Sign out all sessions' : /^logoutSign out$|^Sign out$/ }))
    expect(all ? session.logoutAll : session.logout).toHaveBeenCalledOnce()
  })
})

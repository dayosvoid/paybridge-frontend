import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Home from './Home'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Setup Check diagnostics', () => {
  it('keeps the diagnostic component available independently of the homepage', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: 'PayBridge' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Setup check' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check the API' })).toBeInTheDocument()
  })

  it('says the API is reachable when it answers 401', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized', message: 'x' }), { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: 'Check the API' }))
    expect(await screen.findByRole('status')).toHaveTextContent('reachable')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ method: 'GET', headers: { Accept: 'application/json' } }))
  })

  it('says so when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: 'Check the API' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(screen.queryByRole('status')).toBeNull()
  })
})

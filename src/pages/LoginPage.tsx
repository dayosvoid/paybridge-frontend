import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { LoginForm } from '../components/auth/LoginForm'
import { login } from '../auth/session'
import { useAuth } from '../hooks/useAuth'

type LoginFields = { email?: string; password?: string }

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<LoginFields>({})
  const navigate = useNavigate()
  const session = useAuth()

  if (session.authenticated) return <Navigate to="/dashboard" replace />

  async function submit(values: { email: string; password: string }) {
    setError(undefined)
    const errors: LoginFields = {}
    if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email address.'
    if (!values.password) errors.password = 'Enter your password.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await login(values.email, values.password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LoginForm
      onSubmit={submit}
      submitting={submitting}
      formError={error}
      fieldErrors={fieldErrors}
      onGoToRegister={() => navigate('/register')}
    />
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { RegisterForm } from '../components/auth/RegisterForm'
import { login, register } from '../auth/session'

type RegisterFields = { fullName?: string; email?: string; password?: string }

export default function RegisterPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<RegisterFields>({})
  const navigate = useNavigate()

  async function submit(values: { fullName: string; email: string; password: string }) {
    setError(undefined)
    const errors: RegisterFields = {}
    if (values.fullName.trim().length === 0) errors.fullName = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email address.'
    if (values.password.length < 8) errors.password = 'Use at least 8 characters.'
    if (values.password.length > 72) errors.password = 'Use no more than 72 characters.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await register(values)
      // Registration and login are separate backend operations; navigate only after login succeeds.
      await login(values.email, values.password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegisterForm
      onSubmit={submit}
      submitting={submitting}
      formError={error}
      fieldErrors={fieldErrors}
      onGoToLogin={() => navigate('/login')}
    />
  )
}

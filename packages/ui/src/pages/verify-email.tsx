import { useAuthContext } from '@lombokapp/auth-utils'
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router'

export const VerifyEmailPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authContext = useAuthContext()
  const submitted = React.useRef(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('Missing verification token')
      return
    }

    if (!submitted.current) {
      submitted.current = true
      authContext
        .verifyEmail(token)
        .then(() => {
          void navigate('/login?verified=1', { replace: true })
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Verification failed')
        })
    }
  }, [searchParams, authContext, navigate])

  if (error) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="mb-4 text-xl font-semibold text-destructive">
            Verification failed
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            type="button"
            className="mt-6 text-primary underline"
            onClick={() => void navigate('/login')}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-xl font-semibold">Verifying your email...</h2>
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  )
}

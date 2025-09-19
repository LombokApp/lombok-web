import { useAuthContext } from '@lombokapp/auth-utils'
import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

export const SSOCallbackPage = () => {
  const navigate = useNavigate()
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const authContext = useAuthContext()
  const submitted = React.useRef(false)

  React.useEffect(() => {
    const code = searchParams.get('code')

    if (!code || !provider) {
      void navigate('/login')
      return
    }

    try {
      if (!submitted.current) {
        submitted.current = true
        setTimeout(() => {
          void authContext.handleSSOCallback(provider, { code })
        }, 500)
      }
    } catch {
      void navigate('/login')
    }
  }, [searchParams, provider, authContext, navigate])

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-xl font-semibold">Processing sign-in...</h2>
        <div className="mx-auto size-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    </div>
  )
}

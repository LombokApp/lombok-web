import { useAuthContext } from '@lombokapp/auth-utils'
import React from 'react'
import { useNavigate } from 'react-router'

import { LoginComponent } from '../components/login/login.component'
import { usePublicSettingsContext } from '../contexts/public-settings'

export const Login = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { settings } = usePublicSettingsContext()

  // Copy error and clear it from authContext
  const [localError, setLocalError] = React.useState(authContext.authError)

  React.useEffect(() => {
    if (authContext.authError) {
      setLocalError(authContext.authError)
      authContext.clearError()
    }
  }, [authContext])

  const handleLoginSubmit = React.useCallback(
    async ({ login, password }: { login: string; password: string }) => {
      await authContext.login({ login, password })
      void navigate('/folders')
    },
    [authContext, navigate],
  )

  return (
    <div className="flex size-full flex-col justify-around bg-foreground/[.03]">
      <LoginComponent
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        googleOAuthEnabled={settings?.GOOGLE_OAUTH_ENABLED ?? false}
        error={localError}
        onSignup={() => void navigate('/signup')}
        onSubmit={handleLoginSubmit}
      />
    </div>
  )
}

export default Login

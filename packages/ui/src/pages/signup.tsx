import { useAuthContext } from '@lombokapp/auth-utils'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import React from 'react'
import { useNavigate } from 'react-router'

import { SignupComponent } from '../components/signup/signup.component'
import { usePublicSettingsContext } from '../contexts/public-settings'

export const Signup = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { settings } = usePublicSettingsContext()

  // Copy error and clear it from authContext
  const [localError, setLocalError] = React.useState(authContext.authError)

  React.useEffect(() => {
    if (authContext.authError) {
      setLocalError(authContext.authError)
      authContext.clearError()
    }
  }, [authContext])

  const handleSignupSubmit = React.useCallback(
    async ({
      username,
      email,
      password,
    }: {
      username: string
      email?: string
      password: string
    }) => {
      const result = await authContext
        .signup({ username, email, password })
        .then((r) => {
          void navigate('/login')
          return r
        })

      if (result.response.status === 201) {
        toast({
          title: 'Account created',
        })
      } else if (result.response.status === 403) {
        toast({
          title: 'Signups are not enabled',
          description: 'Please contact your administrator.',
        })
      } else {
        console.error({
          errorCode: result.response.status,
          response: result.data,
        })
      }
    },
    [authContext, navigate, toast],
  )
  return (
    <div className="flex size-full flex-col justify-around bg-foreground/[.03]">
      <SignupComponent
        googleOAuthEnabled={settings?.GOOGLE_OAUTH_ENABLED ?? false}
        error={localError}
        onSubmit={handleSignupSubmit}
      />
    </div>
  )
}

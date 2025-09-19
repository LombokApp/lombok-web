import { useAuthContext } from '@lombokapp/auth-utils'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import {
  UsernameSelectionComponent,
  type UsernameSelectionFormValues,
} from '@/src/components/sso/username-selection.component'

interface SSOUserInfo {
  id: string
  email?: string
  name?: string
  picture?: string
}

interface LocationState {
  provider: string
  providerUserInfo: SSOUserInfo
  expiry: string
  signature: string
  suggestedUsername: string
}

export const SSOUsernameSelectionPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = React.useState<string>('')
  const authContext = useAuthContext()

  const state = location.state as LocationState | null

  React.useEffect(() => {
    if (!state) {
      // Redirect to login if no state
      void navigate('/login')
    }
  }, [state, navigate])

  const handleUsernameSubmit = async (values: UsernameSelectionFormValues) => {
    if (!state) {
      return
    }

    // Clear any previous errors
    setError('')

    await authContext.completeSSOSignup({
      username: values.username,
      providerData: {
        provider: state.provider as 'google',
        providerUserInfo: state.providerUserInfo as {
          id: string
          email: string
          name: string
          picture?: string
        },
        expiry: state.expiry,
      },
      signature: state.signature,
    })
  }

  if (!state) {
    return null
  }

  return (
    <UsernameSelectionComponent
      suggestedUsername={state.suggestedUsername}
      providerName={
        state.provider.charAt(0).toUpperCase() + state.provider.slice(1)
      }
      error={error}
      onSubmit={handleUsernameSubmit}
    />
  )
}

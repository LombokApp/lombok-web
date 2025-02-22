import { useAuthContext } from '@stellariscloud/auth-utils'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { SignupComponent } from '../components/signup/signup.component'

export const Signup = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()

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
      await authContext
        .signup({ username, email, password })
        .then(() => navigate('/login'))
        // eslint-disable-next-line no-console
        .catch((e) => console.error(e))
    },
    [authContext, navigate],
  )
  return (
    <div className="flex size-full flex-col justify-around">
      <SignupComponent
        onLogin={() => void navigate('/login')}
        onSubmit={handleSignupSubmit}
      />
    </div>
  )
}

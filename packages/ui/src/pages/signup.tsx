import { useAuthContext } from '@stellariscloud/auth-utils'
import { useToast } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { SignupComponent } from '../components/signup/signup.component'

export const Signup = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()
  const { toast } = useToast()

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
        onLogin={() => void navigate('/login')}
        onSubmit={handleSignupSubmit}
      />
    </div>
  )
}

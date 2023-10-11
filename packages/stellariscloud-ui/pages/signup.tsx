import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { SignupComponent } from '../components/signup/signup.component'

const Login: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()

  const handleSignupSubmit = React.useCallback(
    async ({
      username,
      email,
      password,
    }: {
      username: string
      email: string
      password: string
    }) => {
      await authContext
        .signup({ username, email, password })
        .then(() => router.push('/login'))
        .catch((e) => console.error(e))
    },
    [authContext, router],
  )
  return (
    <div className="h-full w-full flex flex-col justify-around">
      <SignupComponent
        onLogin={() => void router.push('/login')}
        onSubmit={handleSignupSubmit}
      />
    </div>
  )
}

export default Login

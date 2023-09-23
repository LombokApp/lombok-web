import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { LoginComponent } from '../components/login/login.component'

const Login: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  const handleLoginSubmit = React.useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      await authContext
        .login({ login: email, password })
        .then(() => router.push('/folders'))
        .catch((e) => console.error(e))
    },
    [authContext, router],
  )

  return (
    <div className="h-full w-full flex flex-col justify-around">
      <LoginComponent
        onSignup={() => void router.push('/signup')}
        onSubmit={handleLoginSubmit}
      />
    </div>
  )
}

export default Login

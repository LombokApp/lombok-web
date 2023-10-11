import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { LoginComponent } from '../components/login/login.component'

const Login: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  const handleLoginSubmit = React.useCallback(
    async ({ login, password }: { login: string; password: string }) => {
      const loginSuccess = await authContext.login({ login, password })
      if (loginSuccess) {
        void router.push('/folders')
      }
    },
    [authContext, router],
  )

  return (
    <div className="h-full w-full flex flex-col justify-around">
      <LoginComponent
        error={(authContext.error as any)?.response.data.errors[0].code}
        onSignup={() => void router.push('/signup')}
        onSubmit={handleLoginSubmit}
      />
    </div>
  )
}

export default Login

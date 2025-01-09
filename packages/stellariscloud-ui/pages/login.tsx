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
        error={
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          (authContext.error as any)?.response?.errors
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              (authContext.error as any)?.response?.errors[0].code
            : undefined
        }
        onSignup={() => void router.push('/signup')}
        onSubmit={handleLoginSubmit}
      />
    </div>
  )
}

export default Login

import { useAuthContext } from '@lombokapp/auth-utils'
import React from 'react'
import { useNavigate } from 'react-router'

import { LoginComponent } from '../components/login/login.component'

export const Login = () => {
  const authContext = useAuthContext()
  const navigate = useNavigate()
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
        error={
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          (authContext.error as any)?.response?.errors
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              (authContext.error as any)?.response?.errors[0].code
            : undefined
        }
        onSignup={() => void navigate('/signup')}
        onSubmit={handleLoginSubmit}
      />
    </div>
  )
}

export default Login

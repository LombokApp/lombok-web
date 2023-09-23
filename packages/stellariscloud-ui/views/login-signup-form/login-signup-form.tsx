import { useAuthContext } from '@stellariscloud/auth-utils'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { LoginForm } from '../../components/login-form/login-form'
import { SignupForm } from '../../components/signup-form/signup-form'

export const LoginSignupForm = ({
  shouldShowSignup = false,
}: {
  shouldShowSignup: boolean
}) => {
  const router = useRouter()
  const authContext = useAuthContext()

  const handleSignupClick = React.useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      await authContext
        .signup({ email, password })
        .then(() => router.push('/login'))
        .catch((e) => console.error(e))
    },
    [authContext, router],
  )

  const handleLoginClick = React.useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      await authContext
        .login({ login: email, password })
        .then(() => router.push('/folders'))
        .catch((e) => console.error(e))
    },
    [authContext, router],
  )

  return (
    <div className={clsx('items-center flex flex-col gap-6 pb-10')}>
      <div className="container">
        {!shouldShowSignup ? (
          <LoginForm
            onLogin={handleLoginClick}
            onGotoSignup={() => void router.push('/signup')}
          />
        ) : (
          <SignupForm
            onSignup={handleSignupClick}
            onGotoLogin={() => void router.push('/login')}
          />
        )}
      </div>
    </div>
  )
}

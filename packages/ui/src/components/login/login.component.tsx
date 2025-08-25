import {
  Card,
  CardContent,
  TypographyH2,
  TypographyH3,
} from '@lombokapp/ui-toolkit'
import React from 'react'

import type { LoginFormValues } from './login-form.component'
import { LoginForm } from './login-form.component'

export const LoginComponent = ({
  // error,
  onSubmit,
}: {
  error?: string
  onSubmit: (input: { login: string; password: string }) => Promise<void>
  onSignup: () => void
}) => {
  const handleSubmit = React.useCallback(
    async (values: LoginFormValues) => {
      return onSubmit({
        login: values.login,
        password: values.password,
      })
    },
    [onSubmit],
  )

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <Card className="min-w-[30rem]">
        <CardContent className="px-6 py-12 lg:px-8">
          <div className="mb-6 flex flex-col items-center gap-6">
            <img className="mx-auto h-24 w-auto" src="/logo.png" alt="Lombok" />
            <TypographyH2>Lombok</TypographyH2>
            <TypographyH3>Create an Account</TypographyH3>
          </div>
          <LoginForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}

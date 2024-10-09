import React from 'react'
import * as r from 'runtypes'

import {
  Card,
  CardContent,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { LoginForm, LoginFormValues } from './login-form.component'

export const LoginComponent = ({
  error,
  onSubmit,
}: {
  error?: string
  onSubmit: (input: { login: string; password: string }) => Promise<void>
  onSignup: () => void
}) => {
  const [errors, _setErrors] = React.useState({
    login: '',
    password: '',
  })

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
      <Card className="w-content min-w-[30rem]">
        <CardContent className="px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-6 mb-6 items-center">
            <img
              className="mx-auto h-24 w-auto"
              src="/stellariscloud.png"
              alt="StellarisCloud"
            />
            <TypographyH2>Stellaris Cloud</TypographyH2>
            <TypographyH3>Create an Account</TypographyH3>
          </div>
          <LoginForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}

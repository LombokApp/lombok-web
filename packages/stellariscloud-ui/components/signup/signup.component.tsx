import { ArrowRightIcon } from '@heroicons/react/24/outline'
import {
  EMAIL_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import React from 'react'

import {
  Card,
  CardContent,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { SignupForm } from './signup-form.component'

interface SignupFormValues {
  username: string
  password: string
  confirmPassword: string
  email: string
}

export const SignupComponent = ({
  onSubmit,
}: {
  onSubmit: (input: {
    username: string
    email: string
    password: string
  }) => Promise<void>
  onLogin: () => void
}) => {
  const handleSubmit = React.useCallback(
    async (values: SignupFormValues) => {
      return onSubmit({
        username: values.username,
        email: values.email ?? '',
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
          <SignupForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}

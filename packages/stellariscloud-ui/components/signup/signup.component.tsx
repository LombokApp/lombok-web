import { ArrowRightIcon } from '@heroicons/react/24/outline'
import {
  EMAIL_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { SignupForm, SignupFormValues } from './signup-form.component'
import Link from 'next/link'

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
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 lg:px-8">
          <SignupForm onSubmit={handleSubmit} />
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

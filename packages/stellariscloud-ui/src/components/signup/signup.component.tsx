import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stellariscloud/ui-toolkit'
import Link from 'next/link'
import React from 'react'

import type { SignupFormValues } from './signup-form.component'
import { SignupForm } from './signup-form.component'

export const SignupComponent = ({
  onSubmit,
}: {
  onSubmit: (input: {
    username: string
    email?: string
    password: string
  }) => Promise<void>
  onLogin: () => void
}) => {
  const handleSubmit = React.useCallback(
    async (values: SignupFormValues) => {
      return onSubmit({
        username: values.username,
        email: values.email,
        password: values.password,
      })
    },
    [onSubmit],
  )

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <Card className="min-w-[30rem]">
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

import type { AuthError } from '@lombokapp/auth-utils'
import {
  Alert,
  AlertDescription,
} from '@lombokapp/ui-toolkit/components/alert/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card/card'
import React from 'react'
import { Link } from 'react-router'

import { SSOButtons } from '../sso/sso-buttons.component'
import type { SignupFormValues } from './signup-form.component'
import { SignupForm } from './signup-form.component'

export const SignupComponent = ({
  error,
  onSubmit,
  googleOAuthEnabled = false,
}: {
  error?: AuthError
  onSubmit: (input: {
    username: string
    email?: string
    password: string
  }) => Promise<void>
  googleOAuthEnabled?: boolean
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
          {/* Error Alert */}
          {error && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </div>
          )}

          <SignupForm onSubmit={handleSubmit} />

          {/* Divider - only show if SSO is enabled */}
          {googleOAuthEnabled && (
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}

          {googleOAuthEnabled && (
            <div className="mt-4">
              <SSOButtons />
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

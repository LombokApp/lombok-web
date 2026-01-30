import type { AuthError } from '@lombokapp/auth-utils'
import {
  Alert,
  AlertDescription,
} from '@lombokapp/ui-toolkit/components/alert/alert'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { CardContent } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { TypographyH2 } from '@lombokapp/ui-toolkit/components/typography-h2/typography-h2'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import React from 'react'

import { SSOButtons } from '../sso/sso-buttons.component'
import type { LoginFormValues } from './login-form.component'
import { LoginForm } from './login-form.component'

export const LoginComponent = ({
  error,
  onSubmit,
  onSignup,
  googleOAuthEnabled = false,
}: {
  error?: AuthError
  onSubmit: (input: { login: string; password: string }) => Promise<void>
  onSignup: () => void
  googleOAuthEnabled?: boolean
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
            <TypographyH3>Sign In</TypographyH3>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* SSO Buttons */}
          {googleOAuthEnabled && (
            <div className="mb-4">
              <SSOButtons />
            </div>
          )}

          {/* Divider - only show if SSO is enabled */}
          {googleOAuthEnabled && (
            <div className="relative mb-4">
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

          <LoginForm onSubmit={handleSubmit} />

          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Button
              variant="link"
              className="h-auto p-0 text-sm underline"
              onClick={onSignup}
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

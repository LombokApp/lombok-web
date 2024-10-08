import { ArrowRightIcon } from '@heroicons/react/24/outline'
import {
  EMAIL_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Icon } from '../../design-system/icon'
import { Input } from '../../design-system/input/input'
import type { FormFieldConfig } from '../../utils/forms'
import { useFormState } from '../../utils/forms'
import {
  Button,
  Card,
  CardContent,
  Label,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'

interface SignupFormValues {
  username: string
  password: string
  confirmPassword: string
  email: string
}

export const SignupComponent = ({
  onSubmit,
  onLogin,
}: {
  onSubmit: (input: {
    username: string
    email: string
    password: string
  }) => Promise<void>
  onLogin: () => void
}) => {
  const [formFields] = React.useState<{
    [key in keyof SignupFormValues]: FormFieldConfig<SignupFormValues[key]>
  }>({
    username: {
      validator: USERNAME_VALIDATORS_COMBINED,
      defaultValue: '',
    },
    email: {
      validator: EMAIL_VALIDATORS_COMBINED,
      defaultValue: '',
    },
    password: {
      validator: r.String,
      defaultValue: '',
    },
    confirmPassword: {
      validator: r.String,
      defaultValue: '',
    },
  })

  const form = useFormState(formFields)

  const handleSubmit = React.useCallback(() => {
    const v = form.values
    if (v.username && v.password) {
      void onSubmit({
        username: v.username,
        email: v.email ?? '',
        password: v.password,
      })
    }
  }, [form, onSubmit])

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <Card className="w-content min-w-[30rem]">
        <CardContent className="px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center ">
            <img
              className="mx-auto h-24 w-auto"
              src="/stellariscloud.png"
              alt="StellarisCloud"
            />
            <TypographyH2>Create your account</TypographyH2>
            <Button onClick={onLogin} variant={'link'}>
              <div className="flex items-center gap-1">
                <TypographyH3>Login</TypographyH3>
                <Icon
                  icon={ArrowRightIcon}
                  size="sm"
                  className="text-indigo-600 group-hover:text-indigo-500 dark:text-indigo-400 dark:group-hover:text-indigo-300"
                />
              </div>
            </Button>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-4" action="#" method="POST">
              <div className="flex flex-col gap-1">
                <Label htmlFor="username">Username</Label>
                <div>
                  <Input
                    error={
                      !form.state.fields.username.valid
                        ? form.state.fields.username.error
                        : undefined
                    }
                    id="username"
                    name="username"
                    type="username"
                    autoComplete="username"
                    required={true}
                    value={form.values.username}
                    onChange={(e) => form.setValue('username', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="username">Email</Label>
                <div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required={true}
                    value={form.values.email}
                    onChange={(e) => form.setValue('email', e.target.value)}
                    error={
                      form.state.fields.email.valid
                        ? form.state.fields.email.error
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div>
                  <Input
                    id="password"
                    name="password"
                    value={form.values.password}
                    type="password"
                    error={
                      !form.state.fields.password.valid
                        ? form.state.fields.username.error
                        : undefined
                    }
                    autoComplete="current-password"
                    required={true}
                    onChange={(e) => form.setValue('password', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                </div>
                <div>
                  <Input
                    id="confirm_password"
                    name="password"
                    type="password"
                    value={form.values.confirmPassword}
                    required={true}
                    onChange={(e) =>
                      form.setValue('confirmPassword', e.target.value)
                    }
                    error={
                      !form.state.fields.confirmPassword.valid
                        ? form.state.fields.confirmPassword.error
                        : undefined
                    }
                  />
                </div>
              </div>

              <div>
                <Button
                  className="w-full py-1.5"
                  onClick={handleSubmit}
                  disabled={!form.state.valid}
                >
                  Create your account
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

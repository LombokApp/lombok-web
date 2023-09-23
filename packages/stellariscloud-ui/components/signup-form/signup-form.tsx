import { Button, Input } from '@stellariscloud/design-system'
import React from 'react'

import { useFormState } from '../../utils/forms'

interface LoginFormValues {
  email: string
  password: string
  confirmPassword: string
}

export const SignupForm = ({
  onGotoLogin,
  onSignup,
}: {
  onSignup: ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => Promise<void>
  onGotoLogin: () => void
}) => {
  const form = useFormState<LoginFormValues>(
    {
      email: '',
      password: '',
      confirmPassword: '',
    },
    {
      email: (_value: string | undefined) => ({ valid: true }),
      password: (value: string | undefined) => ({ valid: !!value }),
      confirmPassword: (value: string | undefined) => ({ valid: !!value }),
    },
  )
  const handleLogin = () => {
    const v = form.getValues()
    void onSignup({ email: v.email, password: v.password })
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-stretch">
      <div className="p-4 flex gap-4 rounded-md">
        <div className="flex flex-col">
          <div className="flex flex-col flex-1 gap-2">
            <div>
              <Input
                label="Email"
                name="username"
                value={form.state.fields.email.value}
                onChange={(e) => form.setValue('email', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                value={form.state.fields.password.value}
                onChange={(e) => form.setValue('password', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Confirm password"
                name="confirm_password"
                type="password"
                value={form.state.fields.confirmPassword.value}
                onChange={(e) =>
                  form.setValue('confirmPassword', e.target.value)
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleLogin} disabled={!form.state.valid}>
              Signup
            </Button>
            <Button onClick={onGotoLogin}>Login</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

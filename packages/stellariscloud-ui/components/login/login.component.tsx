import { ArrowRightIcon } from '@heroicons/react/24/outline'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'

interface LoginFormValues {
  email: string
  password: string
}

export const LoginComponent = ({
  onSubmit,
  onSignup,
}: {
  onSubmit: (input: { email: string; password: string }) => Promise<void>
  onSignup: () => void
}) => {
  const form = useFormState<LoginFormValues>(
    {
      email: '',
      password: '',
    },
    {
      email: (_value: string | undefined) => ({ valid: true }),
      password: (value: string | undefined) => ({ valid: !!value }),
    },
  )

  const handleSubmit = React.useCallback(() => {
    const v = form.getValues()
    if (v.email && v.password) {
      void onSubmit({ email: v.email, password: v.password })
    }
  }, [form, onSubmit])

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        <img
          className="mx-auto h-24 w-auto"
          src="/stellariscloud.png"
          alt="StellarisCloud"
        />
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <button
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          onClick={onSignup}
        >
          <div className="flex items-center gap-1">
            <div>Sign up</div>
            <Icon icon={ArrowRightIcon} size="sm" />
          </div>
        </button>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action="#" method="POST">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
            >
              Email address
            </label>
            <div className="mt-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required={true}
                onChange={(e) => form.setValue('email', e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
              >
                Password
              </label>
              <div className="text-sm">
                <button className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Forgot password?
                </button>
              </div>
            </div>
            <div className="mt-2">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required={true}
                onChange={(e) => form.setValue('password', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button className="w-full py-1.5" onClick={handleSubmit} primary>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

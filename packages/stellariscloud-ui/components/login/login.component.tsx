import { ArrowRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React from 'react'
import * as r from 'runtypes'

import { Banner } from '../../design-system/banner/banner'
import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'

export const LoginComponent = ({
  error,
  onSubmit,
  onSignup,
}: {
  error?: string
  onSubmit: (input: { login: string; password: string }) => Promise<void>
  onSignup: () => void
}) => {
  const form = useFormState({
    login: {
      validator: r.String,
      defaultValue: '',
    },
    password: {
      validator: r.String,
      defaultValue: '',
    },
  })

  const [errors, _setErrors] = React.useState({
    login: '',
    password: '',
  })

  const handleSubmit = React.useCallback(() => {
    if (form.values.login && form.values.password) {
      void onSubmit({
        login: form.values.login,
        password: form.values.password,
      })
    }
  }, [form, onSubmit])

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8">
      <div className="border border-gray-200 rounded-lg w-content px-6 py-12 bg-gray-50 dark:bg-white/5 dark:border-0 min-w-[30rem]">
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
            className="group font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            onClick={onSignup}
          >
            <div className="flex items-center gap-1">
              <div>Create an account</div>
              <Icon
                icon={ArrowRightIcon}
                size="sm"
                className="text-indigo-600 group-hover:text-indigo-500 dark:text-indigo-400 dark:group-hover:text-indigo-300"
              />
            </div>
          </button>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="mt-6 mb-4">
              <Banner type="error" body="Login or password was invalid." />
            </div>
          )}
          <form className="space-y-4" action="#" method="POST">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="login"
                className={clsx(
                  'block text-sm font-medium',
                  'leading-6 text-gray-900 dark:text-white',
                )}
              >
                Username / Email
              </label>
              <div>
                <Input
                  error={errors.login}
                  id="login"
                  name="login"
                  type="login"
                  autoComplete="login"
                  required={true}
                  value={form.values.login}
                  onChange={(e) => {
                    form.setValue('login', e.target.value)
                    console.log(
                      'new login value [%s] [%s]',
                      e.target.value,
                      form.values.login,
                    )
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
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
              <div>
                <Input
                  error={errors.password}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.values.password}
                  required={true}
                  onChange={(e) => form.setValue('password', e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full py-1.5" onClick={handleSubmit} primary>
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

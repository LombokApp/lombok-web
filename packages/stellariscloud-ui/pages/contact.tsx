import { EMAIL_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import type { NextPage } from 'next'
import React from 'react'
import * as r from 'runtypes'

import { Button } from '../design-system/button/button'
import { Input } from '../design-system/input/input'
import { useFormState } from '../utils/forms'

const Contact: NextPage = () => {
  const form = useFormState({
    name: { validator: r.String },
    email: { validator: EMAIL_VALIDATORS_COMBINED },
    message: { validator: r.String },
  })
  return (
    <div className="h-full py-24 sm:py-32 overflow-y-auto">
      <div className="flex flex-col gap-8 items-center">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mt-2 text-8xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-6xl">
            Get in touch
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
          If you want to speak to us, then we want to speak to you.
        </p>
        <div className="flex flex-col justify-center items-center text-center space-y-4 text-center">
          <form className="flex flex-col items-center gap-4 text-center min-w-[30rem]">
            <div className="flex flex-col gap-2 w-full">
              <Input
                className="flex-1 h-full w-full"
                elementSize={'lg'}
                placeholder="Name"
                type="text"
                value={form.getValues().name}
                onChange={(e) => form.setValue('name', e.target.value)}
              />
              <Input
                error={form.state?.fields.email.error}
                className="flex-1 h-full w-full"
                elementSize={'lg'}
                placeholder="Email"
                type="email"
                onChange={(e) => form.setValue('email', e.target.value)}
                value={form.getValues().email}
              />
            </div>
            <textarea
              rows={15}
              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 dark:ring-gray-600 dark:bg-gray-400/5 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              id="message"
              value={form.getValues().message}
              onChange={(e) => form.setValue('message', e.target.value)}
            />
            <Button primary size="lg" className="w-full">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Contact

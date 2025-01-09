import React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from '@stellariscloud/ui-toolkit'

export interface ServerSettingsFormValues {
  SIGNUP_PERMISSIONS: string[]
  SIGNUP_ENABLED: boolean
}

const formSchema = z.object({
  SIGNUP_PERMISSIONS: z.array(
    z.string().min(2, {
      message: 'Username must be at least 2 characters.',
    }),
  ),
  SIGNUP_ENABLED: z.boolean(),
})

export const ServerSettingsForm = ({
  // onChange,
  // formValue,
  onSubmit,
  onReset,
}: {
  onReset: () => void
  onChange: (updatedFormValue: {
    valid: boolean
    value: ServerSettingsFormValues
  }) => void
  onSubmit: (updatedFormValue: {
    valid: boolean
    values: ServerSettingsFormValues
  }) => Promise<void>
  formValue: Partial<ServerSettingsFormValues>
}) => {
  // const [fieldConfigs, _setFieldConfigs] = React.useState({
  //   SIGNUP_PERMISSIONS: {
  //     validator: r.Array(r.String),
  //     currentValue: formValue.SIGNUP_PERMISSIONS,
  //     defaultValue: [],
  //   },
  //   SIGNUP_ENABLED: {
  //     validator: r.Boolean,
  //     currentValue: formValue.SIGNUP_ENABLED,
  //     defaultValue: false,
  //   },
  // })

  // const form = useFormState(fieldConfigs, formValue, onChange)
  const form = useForm<ServerSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // security_emails: true,
    },
  })

  function handleSubmit(values: ServerSettingsFormValues) {
    return onSubmit({ valid: true, values })
  }

  const SETTINGS_SECTIONS = [
    {
      title: 'Signup Enabled',
      description:
        'Disabling this prevents users from signing up on this server.',
      component: () => (
        <FormField
          control={form.control}
          name="SIGNUP_ENABLED"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SignupEnabled</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Disabling this prevents users from signing up on this server.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ),
    },
  ]

  return (
    <div className="">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit(handleSubmit)(e)
          }}
          className="space-y-4"
        >
          <dl>
            {SETTINGS_SECTIONS.map(
              ({ component: Component, title, description }, i) => (
                <div
                  key={i}
                  className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
                >
                  <dt className="text-sm font-medium leading-6">
                    {title}
                    <div className="mt-1 mr-4 font-normal text-sm leading-6 sm:col-span-2 sm:mt-0 opacity-50">
                      {description}
                    </div>
                  </dt>
                  <dd className="mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0">
                    <Component key={i} />
                  </dd>
                </div>
              ),
            )}
          </dl>
          <div>
            <div className="flex gap-2">
              <Button onClick={onReset} variant={'outline'}>
                <span className="capitalize">Reset</span>
              </Button>
              <Button
                onClick={() =>
                  void onSubmit({
                    valid: true,
                    values: form.getValues(),
                  })
                }
                disabled={!false}
              >
                <span className="capitalize">Save</span>
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  cn,
  Button,
  Input,
  Form,
  FormItem,
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Icons,
} from '@stellariscloud/ui-toolkit'

const formSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  password: z.string().min(2, {
    message: 'Password must be at least 2 characters.',
  }),
  confirmPassword: z.string().min(2, {
    message: 'Password must be at least 2 characters.',
  }),
  email: z.string().min(2, {
    message: 'Email must be at least 2 characters.',
  }),
})
export type SignupFormValues = z.infer<typeof formSchema>

export function SignupForm({
  className,
  onSubmit,
}: {
  className?: string
  onSubmit: (values: SignupFormValues) => Promise<void>
}) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function handleSubmit(values: SignupFormValues) {
    setIsLoading(true)
    return onSubmit(values).then(() => {
      setIsLoading(false)
    })
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  return (
    <div className={cn('grid gap-6', className)}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit(handleSubmit)(e)
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button
              className="w-full py-1.5"
              type="submit"
              // disabled={!form.state.valid || isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create your account
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

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
  FormMessage,
  Icons,
} from '@stellariscloud/ui-toolkit'

const formSchema = z.object({
  login: z.string().min(2, {
    message: 'Login must be at least 2 characters.',
  }),
  password: z.string().min(2, {
    message: 'Password must be at least 2 characters.',
  }),
})

export type LoginFormValues = z.infer<typeof formSchema>

export function LoginForm({
  className,
  onSubmit,
}: {
  className?: string
  onSubmit: (values: LoginFormValues) => Promise<void>
}) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function handleSubmit(values: LoginFormValues) {
    setIsLoading(true)
    onSubmit(values).then(() => {
      setIsLoading(false)
    })
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: '',
      password: '',
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
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username / Email</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="username" />
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
                  <Input
                    {...field}
                    autoComplete="current-password"
                    type="password"
                  />
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
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

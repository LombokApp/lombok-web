import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../button'
import { Input } from '../input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'

const meta: Meta<typeof Form> = {
  title: 'Components/Form',
  component: Form,
}

export default meta

type Story = StoryObj<typeof Form>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export const BasicUsage: Story = {
  args: {},
  decorators: [(Story) => <Story />],
  render: () => {
    async function handleSubmit(values: z.infer<typeof formSchema>) {
      console.log('Validated values submitted:', { values })
    }

    const form = useForm<z.infer<typeof formSchema>>({
      defaultValues: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
    })

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 min-w-[20rem]"
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
            <Button className="w-full py-1.5" type="submit">
              Create your account
            </Button>
          </div>
        </form>
      </Form>
    )
  },
}

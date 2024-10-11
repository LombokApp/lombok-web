import React from 'react'

import type { Meta, StoryObj } from '@storybook/react'
import { useForm } from 'react-hook-form'

import { Button } from '../button'
import { Input } from '../input'
import {
  Form,
  FormControl,
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

interface FormType {
  email: string
  confirmPassword: string
  password: string
}

export const BasicUsage: Story = {
  args: {},
  decorators: [(Story) => <Story />],
  render: () => {
    async function handleSubmit(values: FormType) {
      console.log('Validated values submitted:', { values })
    }

    const form = useForm<FormType>({
      defaultValues: {
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

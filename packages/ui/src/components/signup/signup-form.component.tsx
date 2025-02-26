'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  cn,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Input,
} from '@stellariscloud/ui-toolkit'
import {
  EMAIL_VALIDATORS_COMBINED,
  PASSWORD_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: 'Username must be at least 2 characters.',
    })
    .refine((v) => USERNAME_VALIDATORS_COMBINED.safeParse(v).success),
  password: z
    .string()
    .min(2, {
      message: 'Password must be at least 2 characters.',
    })
    .refine((v) => PASSWORD_VALIDATORS_COMBINED.safeParse(v).success),
  confirmPassword: z.string(),
  email: z
    .string()
    .min(2, {
      message: 'Email must be at least 2 characters.',
    })
    .refine((v) => EMAIL_VALIDATORS_COMBINED.safeParse(v).success)
    .optional(),
})
export type SignupFormValues = z.infer<typeof formSchema>

export function SignupForm({
  className,
  onSubmit,
}: {
  className?: string
  onSubmit: (values: SignupFormValues) => Promise<void>
}) {
  // eslint-disable-next-line @typescript-eslint/require-await
  async function handleSubmit(values: SignupFormValues) {
    void onSubmit(values)
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
            <Button className="w-full py-1.5" type="submit">
              {form.formState.isValid &&
                !form.formState.isSubmitting &&
                !form.formState.isSubmitted && (
                  <Icons.spinner className="mr-2 size-5 animate-spin" />
                )}
              Create your account
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

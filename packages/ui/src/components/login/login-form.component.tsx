import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lombokapp/ui-toolkit/components/form/form'
import { Icons } from '@lombokapp/ui-toolkit/components/icons/icons'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
  async function handleSubmit(values: LoginFormValues) {
    return onSubmit(values)
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
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="username"
                    data-testid="login-username-input"
                  />
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
                    data-testid="login-password-input"
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
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              data-testid="login-submit-button"
            >
              {form.formState.isSubmitting && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  AlertDescription,
} from '@lombokapp/ui-toolkit/components/alert/alert'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Card, CardContent } from '@lombokapp/ui-toolkit/components/card'
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
import { TypographyH2 } from '@lombokapp/ui-toolkit/components/typography-h2/typography-h2'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  username: z
    .string()
    .min(3, {
      message: 'Username must be at least 3 characters.',
    })
    .max(64, {
      message: 'Username must be at most 64 characters.',
    }),
})

export type UsernameSelectionFormValues = z.infer<typeof formSchema>

interface UsernameSelectionProps {
  suggestedUsername?: string
  providerName?: string
  error?: string
  onSubmit: (values: UsernameSelectionFormValues) => Promise<void>
  className?: string
}

export function UsernameSelectionComponent({
  suggestedUsername = '',
  providerName = 'SSO',
  error,
  onSubmit,
  className,
}: UsernameSelectionProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function handleSubmit(values: UsernameSelectionFormValues) {
    setIsLoading(true)
    try {
      await onSubmit(values)
    } catch (err) {
      console.error('Username selection failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const form = useForm<UsernameSelectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: suggestedUsername,
    },
  })

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center">
      <Card className="min-w-[30rem]">
        <CardContent className="px-6 py-12 lg:px-8">
          <div className="mb-6 flex flex-col items-center gap-6">
            <img className="mx-auto h-24 w-auto" src="/logo.png" alt="Lombok" />
            <TypographyH2>Choose Your Username</TypographyH2>
            <TypographyH3>Complete your {providerName} signup</TypographyH3>
          </div>

          <div className={cn('grid gap-6', className)}>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                        <Input {...field} autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Button
                    className="w-full py-1.5"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Icons.spinner className="mr-2 size-4 animate-spin" />
                    )}
                    Create Account
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

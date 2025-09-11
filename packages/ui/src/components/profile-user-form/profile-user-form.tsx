import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@lombokapp/ui-toolkit/components/form/form'
import { Icons } from '@lombokapp/ui-toolkit/components/icons/icons'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  NAME_VALIDATORS_COMBINED,
  PASSWORD_VALIDATORS_COMBINED,
} from '@lombokapp/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: 'Name must be at least 3 characters.',
    })
    .refine((v) => NAME_VALIDATORS_COMBINED.safeParse(v).success),
  email: z.string(),
  username: z.string(),
  password: z
    .string()
    .min(2, {
      message: 'Password must be at least 2 characters.',
    })
    .refine((v) => PASSWORD_VALIDATORS_COMBINED.safeParse(v).success),
  confirmPassword: z.string(),
})
export type ProfileUserFormValues = z.infer<typeof formSchema>

export function ProfileUserForm({
  className,
  onSubmit,
  // value,
}: {
  className?: string
  onSubmit: (values: ProfileUserFormValues) => Promise<void>
  value?: Partial<ProfileUserFormValues>
}) {
  // eslint-disable-next-line @typescript-eslint/require-await
  async function handleSubmit(values: ProfileUserFormValues) {
    void onSubmit(values)
  }

  const form = useForm<ProfileUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  This is only visible to server admins.
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
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

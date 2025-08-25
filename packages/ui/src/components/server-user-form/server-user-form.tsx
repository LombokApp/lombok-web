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
} from '@lombokapp/ui-toolkit'
import {
  EMAIL_VALIDATORS_COMBINED,
  NAME_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@lombokapp/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// import { UserPermissions } from './user-permissions'

export interface UserInput {
  name?: string
  username?: string
  password?: string
  id?: string
  email?: string
  permissions?: string[]
  isAdmin: boolean
  emailVerified: boolean
}

export interface UserFormValues {
  id: string
  name: string
  username: string
  email: string
  password: string
  emailVerified: boolean
  isAdmin: boolean
  permissions: string[]
}

const formSchema = z.object({
  name: z
    .string()
    .refine((v) => NAME_VALIDATORS_COMBINED.safeParse(v).success)
    .optional(),
  username: z
    .string()
    .min(2, {
      message: 'Username must be at least 2 characters.',
    })
    .refine((v) => USERNAME_VALIDATORS_COMBINED.safeParse(v).success),
  password: z.string().min(2, {
    message: 'Password must be at least 2 characters.',
  }),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  email: z
    .string()
    .min(2, {
      message: 'Email must be at least 2 characters.',
    })
    .refine((v) => EMAIL_VALIDATORS_COMBINED.safeParse(v).success)
    .optional(),
})
export type CreateUserFormValues = z.infer<typeof formSchema>

export const ServerUserForm = ({
  onSubmit,
  // value = {
  //   id: '',
  //   username: '',
  //   email: '',
  //   password: '',
  //   name: '',
  //   emailVerified: false,
  //   permissions: [],
  //   isAdmin: false,
  // },
  className,
}: {
  onSubmit: (values: CreateUserFormValues) => Promise<void>
  value?: Partial<UserFormValues>
  className?: string
}) => {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })
  // eslint-disable-next-line @typescript-eslint/require-await
  async function handleSubmit(values: CreateUserFormValues) {
    void onSubmit(values)
  }

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
                <FormMessage />
              </FormItem>
            )}
          />
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
                  This is the user's public display name.
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
                  <Input {...field} />
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
              Create user
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import type { UserDTO } from '@stellariscloud/types'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from '@stellariscloud/ui-toolkit'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

export type MutationType = 'CREATE' | 'UPDATE'

const userFormSchema = z.object({
  username: z.string().nonempty(),
  name: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  isAdmin: z.boolean(),
  permissions: z.array(z.string()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .or(z.literal('')),
})

export type UserFormValues = z.infer<typeof userFormSchema>

interface ServerUserFormProps {
  mutationType: MutationType
  value?: UserDTO
  onCancel: () => void
  onSubmit: (values: UserFormValues) => void
}

export function ServerUserForm({
  mutationType,
  value,
  onCancel,
  onSubmit,
}: ServerUserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: value?.username ?? '',
      name: value?.name ?? '',
      email: value?.email ?? '',
      isAdmin: value?.isAdmin ?? false,
      permissions: value?.permissions ?? [],
      password: '',
    },
  })

  return (
    <Form {...form}>
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
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
                  type="password"
                  placeholder={
                    mutationType === 'UPDATE'
                      ? 'Leave blank to keep current password'
                      : ''
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Admin</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Grant admin privileges to this user
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {mutationType === 'CREATE' ? 'Create' : 'Update'} User
          </Button>
        </div>
      </form>
    </Form>
  )
}

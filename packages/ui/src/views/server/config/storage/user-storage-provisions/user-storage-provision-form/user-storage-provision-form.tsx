import { zodResolver } from '@hookform/resolvers/zod'
import type { UserStorageProvisionInputDTO } from '@stellariscloud/api-client'
import {
  UserStorageProvisionTypeEnum,
  UserStorageProvisionTypeZodEnum,
} from '@stellariscloud/types'
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
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const formSchema = z.object({
  label: z.string().min(1, {
    message: 'Label must be at least 1 characters.',
  }),
  endpoint: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  description: z.string(),
  provisionTypes: z.array(UserStorageProvisionTypeZodEnum),
  bucket: z.string(),
  region: z.string(),
  prefix: z.string(),
})

export type UserStorageProvisionFormValues = z.infer<typeof formSchema>

export const UserStorageProvisionForm = ({
  titleText = 'Create New User Storage Provision',
  submitText = 'Create',
  onSubmit,
  onCancel,
  // value = {},
  className,
}: {
  titleText?: string
  submitText?: string
  onSubmit: (values: UserStorageProvisionFormValues) => void
  onCancel: () => void
  value?: Partial<UserStorageProvisionInputDTO>
  className?: string
}) => {
  const form = useForm<UserStorageProvisionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      description: '',
      provisionTypes: [
        UserStorageProvisionTypeEnum.CONTENT,
        UserStorageProvisionTypeEnum.METADATA,
      ],
      accessKeyId: '',
      secretAccessKey: '',
      prefix: '',
      region: '',
    },
  })

  return (
    <div className="dark:bg-white/5 flex size-full flex-col gap-4 rounded-lg bg-gray-50 p-6 py-10">
      <h2 className="dark:text-gray-200 text-3xl font-bold text-gray-800">
        {titleText}
      </h2>
      <div className={cn('grid gap-6', className)}>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    This is how your users will identify the storage location.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key Id</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefix</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant={'secondary'} onClick={onCancel}>
          Cancel
        </Button>
        <Button className="w-full py-1.5" type="submit">
          {form.formState.isValid &&
            !form.formState.isSubmitting &&
            !form.formState.isSubmitted && (
              <Icons.spinner className="mr-2 size-5 animate-spin" />
            )}
          {submitText}
        </Button>
      </div>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import type { UserStorageProvisionInputDTO } from '@stellariscloud/api-client'
import {
  s3LocationEndpointSchema,
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
  label: z.string().nonempty(),
  endpoint: s3LocationEndpointSchema,
  accessKeyId: z.string().nonempty(),
  secretAccessKey: z.string().nonempty(),
  description: z.string().nonempty(),
  provisionTypes: z.array(UserStorageProvisionTypeZodEnum),
  bucket: z.string().nonempty(),
  region: z.string(),
  prefix: z.string(),
})

export type UserStorageProvisionFormValues = z.infer<typeof formSchema>

export const UserStorageProvisionForm = ({
  onSubmit,
  onCancel,
  // value = {},
  className,
  submitText = 'Save',
}: {
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
      bucket: '',
      endpoint: '',
      prefix: '',
      region: '',
    },
  })

  return (
    <div className={cn('grid gap-6', className)}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.trigger().then(() => {
              console.log('form.formState.isValid:', {
                valid: form.formState.isValid,
                errors: form.formState.errors,
              })
              if (form.formState.isValid) {
                void form.handleSubmit(onSubmit)(e)
              }
            })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
            </div>
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              name="secretAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
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
          </div>
          <div className="flex gap-2">
            <Button variant={'secondary'} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {form.formState.isSubmitting ||
                (form.formState.isSubmitted && (
                  <Icons.spinner className="mr-2 size-5 animate-spin" />
                ))}
              {submitText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

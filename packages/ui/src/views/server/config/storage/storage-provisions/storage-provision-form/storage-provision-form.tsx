import { zodResolver } from '@hookform/resolvers/zod'
import type { StorageProvisionDTO } from '@stellariscloud/types'
import {
  s3LocationEndpointSchema,
  StorageProvisionTypeEnum,
  StorageProvisionTypeZodEnum,
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
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

export type MutationType = 'CREATE' | 'UPDATE'

const formSchema = z.object({
  label: z.string().nonempty(),
  endpoint: s3LocationEndpointSchema,
  accessKeyId: z.string().nonempty(),
  secretAccessKey: z.string().nonempty(),
  description: z.string().nonempty(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum),
  bucket: z.string().nonempty(),
  region: z.string(),
  prefix: z.string(),
})

export type StorageProvisionFormValues = z.infer<typeof formSchema>

export const StorageProvisionForm = ({
  onSubmit,
  onCancel,
  value: storageProvision,
  className,
  submitText = 'Save',
  mutationType,
}: {
  submitText?: string
  onSubmit: (values: StorageProvisionFormValues) => void
  onCancel: () => void
  value?: Partial<StorageProvisionDTO>
  className?: string
  mutationType: MutationType
}) => {
  const form = useForm<StorageProvisionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: storageProvision
      ? { ...storageProvision, secretAccessKey: '' }
      : {
          label: '',
          description: '',
          provisionTypes: [
            StorageProvisionTypeEnum.CONTENT,
            StorageProvisionTypeEnum.METADATA,
          ],
          accessKeyId: '',
          secretAccessKey: '',
          bucket: '',
          endpoint: '',
          prefix: '',
          region: '',
        },
  })

  React.useEffect(() => {
    if (storageProvision?.id) {
      form.reset(storageProvision)
      form.setValue('secretAccessKey', '********')
    } else {
      form.reset({
        label: '',
        description: '',
        provisionTypes: [
          StorageProvisionTypeEnum.CONTENT,
          StorageProvisionTypeEnum.METADATA,
        ],
        accessKeyId: '',
        secretAccessKey: '',
        bucket: '',
        endpoint: '',
        prefix: '',
        region: '',
      })
    }
  }, [storageProvision, form.reset, form])

  return (
    <div className={cn('grid gap-6', className)}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.trigger().then(() => {
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
              disabled={mutationType === 'UPDATE'}
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

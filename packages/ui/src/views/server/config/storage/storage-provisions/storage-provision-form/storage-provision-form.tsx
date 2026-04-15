import { zodResolver } from '@hookform/resolvers/zod'
import type {
  StorageProvision,
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '@lombokapp/types'
import {
  s3LocationEndpointSchema,
  StorageProvisionTypeEnum,
  StorageProvisionTypeZodEnum,
} from '@lombokapp/types'
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
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

export type MutationType = 'CREATE' | 'UPDATE'

const formSchema = z.object({
  label: z.string().nonempty(),
  endpoint: s3LocationEndpointSchema,
  accessKeyId: z.string().nonempty(),
  secretAccessKey: z.string().nonempty().nullable(),
  description: z.string().nonempty(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum),
  bucket: z.string().nonempty(),
  region: z.string(),
  prefix: z.string().nullable(),
})

export type StorageProvisionFormValues = z.infer<typeof formSchema>

interface CreateProps {
  input: {
    mutationType: 'CREATE'
    values?: StorageProvisionInputDTO
  }
  onSubmit: (payload: {
    mutationType: 'CREATE'
    values: StorageProvisionInputDTO
  }) => void
}

interface UpdateProps {
  input: {
    mutationType: 'UPDATE'
    values: StorageProvision
  }
  onSubmit: (payload: {
    mutationType: 'UPDATE'
    values: StorageProvisionUpdateDTO
  }) => void
}

type StorageProvisionFormProps = {
  submitText?: string
  onCancel: () => void
  className?: string
} & (CreateProps | UpdateProps)

const emptyFormValues: StorageProvisionFormValues = {
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
}

const toFormValues = (
  props: StorageProvisionFormProps,
): StorageProvisionFormValues => {
  if (props.input.mutationType === 'UPDATE') {
    const v = props.input.values
    return {
      label: v.label,
      description: v.description,
      endpoint: v.endpoint,
      bucket: v.bucket,
      region: v.region,
      accessKeyId: v.accessKeyId,
      secretAccessKey: '********',
      prefix: v.prefix ?? '',
      provisionTypes: v.provisionTypes,
    }
  }
  const v = props.input.values
  if (!v) {
    return emptyFormValues
  }
  return {
    label: v.label,
    description: v.description,
    endpoint: v.endpoint,
    bucket: v.bucket,
    region: v.region,
    accessKeyId: v.accessKeyId,
    secretAccessKey: v.secretAccessKey,
    prefix: v.prefix ?? '',
    provisionTypes: v.provisionTypes,
  }
}

export const StorageProvisionForm = (props: StorageProvisionFormProps) => {
  const { onCancel, className, submitText = 'Save', input } = props
  const { mutationType } = input

  const form = useForm<StorageProvisionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(props),
  })

  React.useEffect(() => {
    form.reset(toFormValues(props))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.values, mutationType])

  const handleSubmit = React.useCallback(
    (values: StorageProvisionFormValues) => {
      if (props.input.mutationType === 'CREATE') {
        const createOnSubmit = props.onSubmit as CreateProps['onSubmit']
        createOnSubmit({
          mutationType: 'CREATE',
          values: {
            label: values.label,
            description: values.description,
            endpoint: values.endpoint,
            bucket: values.bucket,
            region: values.region,
            accessKeyId: values.accessKeyId,
            secretAccessKey: values.secretAccessKey ?? '',
            prefix: values.prefix?.length ? values.prefix : null,
            provisionTypes: values.provisionTypes,
          },
        })
        return
      }
      const updateOnSubmit = props.onSubmit as UpdateProps['onSubmit']
      updateOnSubmit({
        mutationType: 'UPDATE',
        values: {
          label: values.label,
          description: values.description,
          endpoint: values.endpoint,
          bucket: values.bucket,
          region: values.region,
          prefix: values.prefix?.length ? values.prefix : null,
          provisionTypes: values.provisionTypes,
        },
      })
    },
    [props],
  )

  return (
    <div className={cn('grid gap-6', className)}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.trigger().then(() => {
              if (form.formState.isValid) {
                void form.handleSubmit(handleSubmit)(e)
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
                    <Input {...field} disabled={mutationType === 'UPDATE'} />
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
                    <Input
                      {...field}
                      disabled={mutationType === 'UPDATE'}
                      value={field.value ?? ''}
                    />
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
                    <Input {...field} value={field.value ?? ''} />
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

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  cn,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Input,
} from '@lombokapp/ui-toolkit'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const serverLocationFormSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z
    .string()
    .url()
    .refine(
      (e) => {
        try {
          return new URL(e).pathname === '/'
        } catch {
          return false
        }
      },
      {
        message: 'Expected hostname but got URL.',
      },
    ),
  bucket: z.string().min(1),
  region: z.string().min(1),
  prefix: z.string().optional(),
})

export type ServerStorageLocationFormValues = z.infer<
  typeof serverLocationFormSchema
>

export function ServerStorageLocationForm({
  className,
  onSubmit,
  // onCancel,
}: {
  className?: string
  onSubmit: (
    values: Omit<ServerStorageLocationFormValues, 'prefix'> & {
      prefix: string | null
    },
  ) => Promise<void>
  onCancel: () => void
}) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function handleSubmit(values: ServerStorageLocationFormValues) {
    setIsLoading(true)
    const prefix = values.prefix?.length ? values.prefix : null
    await onSubmit({
      ...values,
      prefix,
    }).then(() => {
      setIsLoading(false)
    })
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  const form = useForm<ServerStorageLocationFormValues>({
    resolver: zodResolver(serverLocationFormSchema),
    defaultValues: {
      accessKeyId: '',
      secretAccessKey: '',
      endpoint: '',
      bucket: '',
      region: '',
      prefix: '',
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
          <div className="flex w-full gap-4">
            <div className="w-1/2">
              <FormField
                control={form.control}
                name="accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2">
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
            </div>
          </div>
          <div className="flex w-full gap-4">
            <div className="w-1/2">
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
            </div>
            <div className="w-1/2">
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
            </div>
          </div>
          <div className="flex w-full gap-4">
            <div className="w-1/2">
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
            </div>
            <div className="w-1/2">
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
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full" type="submit">
              {isLoading && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

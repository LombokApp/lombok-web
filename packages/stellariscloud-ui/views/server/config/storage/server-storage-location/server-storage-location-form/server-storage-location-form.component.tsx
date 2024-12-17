'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  cn,
  Button,
  Input,
  Form,
  FormItem,
  FormField,
  FormLabel,
  FormControl,
  FormMessage,
  Icons,
} from '@stellariscloud/ui-toolkit'
import { serverStorageLocationInputSchema } from '@stellariscloud/types'

export type ServerStorageLocationFormValues = z.infer<
  typeof serverStorageLocationInputSchema
>

export function ServerStorageLocationForm({
  className,
  onSubmit,
  onCancel,
}: {
  className?: string
  onSubmit: (values: ServerStorageLocationFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function handleSubmit(values: ServerStorageLocationFormValues) {
    setIsLoading(true)
    onSubmit(values).then(() => {
      setIsLoading(false)
    })
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  const form = useForm<ServerStorageLocationFormValues>({
    resolver: zodResolver(serverStorageLocationInputSchema),
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
          <div className="flex gap-4 w-full">
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
          <div className="flex gap-4 w-full">
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
          <div className="flex gap-4 w-full">
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
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

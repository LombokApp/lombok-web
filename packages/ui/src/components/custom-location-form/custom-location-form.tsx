import { zodResolver } from '@hookform/resolvers/zod'
import { s3LocationSchema } from '@stellariscloud/types'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@stellariscloud/ui-toolkit'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

export type CustomLocationFormValues = z.infer<typeof s3LocationSchema>

export interface CustomLocationFormProps {
  onSubmit: (values: CustomLocationFormValues) => Promise<void>
  onCancel: () => void
}

export const CustomLocationForm = ({
  onSubmit,
  onCancel,
}: CustomLocationFormProps) => {
  const form = useForm<CustomLocationFormValues>({
    resolver: zodResolver(s3LocationSchema),
    defaultValues: {
      accessKeyId: '',
      secretAccessKey: '',
      bucket: '',
      endpoint: '',
      region: '',
      prefix: '',
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.trigger().then(() => {
            if (form.formState.isValid) {
              void form.handleSubmit(onSubmit)(e)
            } else {
              console.log(
                'Got custom location done button click, but form was not valid:',
                form.formState.errors,
              )
            }
          })
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
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
            <Button
              size="sm"
              variant="outline"
              disabled={!form.formState.isValid}
            >
              Test
            </Button>
            <Button size="sm" type="submit" disabled={!form.formState.isValid}>
              Done
            </Button>
            <Button size="sm" variant="link" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

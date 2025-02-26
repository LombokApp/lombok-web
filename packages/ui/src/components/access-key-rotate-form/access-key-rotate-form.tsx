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
} from '@stellariscloud/ui-toolkit'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const formSchema = z.object({
  accessKeyId: z.string().min(1, {
    message: 'Access Key Id must be at least 1 characters.',
  }),
  secretAccessKey: z.string().min(1, {
    message: 'Secret Access Key must be at least 1 characters.',
  }),
})
export type RotateAccessKeyFormValues = z.infer<typeof formSchema>

export function AccessKeyRotateForm({
  onSubmit,
  className,
}: {
  onSubmit?: (input: {
    accessKeyId: string
    secretAccessKey: string
  }) => Promise<void>
  className?: string
}) {
  // eslint-disable-next-line @typescript-eslint/require-await
  async function handleSubmit(values: RotateAccessKeyFormValues) {
    void onSubmit?.(values)
  }

  const form = useForm<RotateAccessKeyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessKeyId: '',
      secretAccessKey: '',
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
            name="accessKeyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key Id</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
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
                <FormDescription>
                  This is your public display name.
                </FormDescription>
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
              Rotate
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
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
import * as z from 'zod'

const StorageProvisionRecord = z.object({
  storageProvisionId: z.string(),
})

const CustomLocationRecord = z.object({
  endpoint: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  region: z.string(),
  prefix: z.string(),
})

const formSchema = z.object({
  name: z.string().min(1, {
    message: 'Username must be at least 1 characters.',
  }),
  contentLocation: z.union([StorageProvisionRecord, CustomLocationRecord]),
  metadataLocation: z
    .union([StorageProvisionRecord, CustomLocationRecord])
    .optional(),
})
export type FolderFormValues = z.infer<typeof formSchema>

export const CreateFolderForm = ({
  onSubmit,
  onCancel,
  // userStorageProvisions,
}: {
  onSubmit: (values: FolderFormValues) => Promise<void>
  onCancel: () => void
  userStorageProvisions: UserStorageProvisionDTO[]
}) => {
  const form = useForm<FolderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contentLocation: {
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: '',
        region: '',
        prefix: '',
      },
      metadataLocation: undefined,
    },
  })

  return (
    <div className="flex flex-col gap-4 lg:min-w-[28rem] lg:max-w-[30rem]">
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folder Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contentLocation.accessKeyId"
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
            name="contentLocation.secretAccessKey"
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
            name="contentLocation.endpoint"
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
            name="contentLocation.region"
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
            name="contentLocation.prefix"
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
          <div className="flex justify-end gap-2">
            <Button variant={'secondary'} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isValid &&
                !form.formState.isSubmitting &&
                !form.formState.isSubmitted
              }
            >
              Create
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

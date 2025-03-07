import { zodResolver } from '@hookform/resolvers/zod'
import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { s3LocationSchema } from '@stellariscloud/types'
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@stellariscloud/ui-toolkit'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import type { CustomLocationFormValues } from '../custom-location-form/custom-location-form'
import { CustomLocationForm } from '../custom-location-form/custom-location-form'
import { StorageLocationDropdown } from '../storage-location-dropdown/storage-location-dropdown'

const storageProvisionDescriptionSchema = z.object({
  storageProvisionId: z.string(),
  label: z.string(),
})
const formSchema = z.object({
  name: z.string().min(1, {
    message: 'Name must be at least 1 characters.',
  }),
  contentLocationStorageProvision: storageProvisionDescriptionSchema.optional(),
  metadataLocationStorageProvision:
    storageProvisionDescriptionSchema.optional(),
  contentLocation: s3LocationSchema.or(
    z.object({
      storageProvisionId: z.string(),
    }),
  ),
  metadataLocation: s3LocationSchema.or(
    z.object({
      storageProvisionId: z.string(),
    }),
  ),
})
// const formSchemaOld = z.object({
//   name: z.string().min(1, {
//     message: 'Name must be at least 1 characters.',
//   }),
//   contentLocationStorageProvision: storageProvisionDescriptionSchema.optional(),
//   metadataLocationStorageProvision:
//     storageProvisionDescriptionSchema.optional(),
//   customContentLocation: s3LocationSchema.optional(),
//   customMetadataLocation: s3LocationSchema.optional(),
// })
export type FolderFormValues = z.infer<typeof formSchema>

export const CreateFolderForm = ({
  onSubmit,
  onCancel,
  userStorageProvisions,
}: {
  onSubmit: (values: FolderFormValues) => Promise<void>
  onCancel: () => void
  userStorageProvisions: UserStorageProvisionDTO[]
}) => {
  const [formConfig, setFormConfig] = useState({
    useCustomContentLocation: false,
    useCustomMetadataLocation: false,
    useStorageProvisionContentLocation: false,
    useStorageProvisionMetadataLocation: false,
  })
  const form = useForm<FolderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const handleContentLocationStorageProvisionSelection = useCallback(
    (storageProvision: UserStorageProvisionDTO) => {
      setFormConfig((_c) => ({
        ..._c,
        useCustomContentLocation: false,
        useStorageProvisionContentLocation: true,
      }))
      form.setValue('contentLocation', {
        storageProvisionId: storageProvision.id,
      })
    },
    [form],
  )

  const handleMetadataLocationStorageProvisionSelection = useCallback(
    (storageProvision: UserStorageProvisionDTO) => {
      setFormConfig((_c) => ({
        ..._c,
        useCustomMetadataLocation: false,
        useStorageProvisionMetadataLocation: true,
      }))
      form.setValue('metadataLocation', {
        storageProvisionId: storageProvision.id,
      })
    },
    [form],
  )

  const [customContentLocationFormOpen, setCustomContentLocationFormOpen] =
    useState(false)
  const [customMetadataLocationFormOpen, setCustomMetadataLocationFormOpen] =
    useState(false)

  const handleStorageProvisionContentLocationRemove = useCallback(() => {
    setFormConfig((_c) => ({
      ..._c,
      useCustomContentLocation: false,
      useStorageProvisionContentLocation: false,
    }))
    form.resetField('contentLocation')
  }, [form])

  const handleStorageProvisionMetadataLocationRemove = useCallback(() => {
    setFormConfig((_c) => ({
      ..._c,
      useCustomMetadataLocation: false,
      useStorageProvisionMetadataLocation: false,
    }))
    form.setValue('metadataLocationStorageProvision', undefined)
  }, [form])

  const handleCustomContentLocationRemove = useCallback(() => {
    setFormConfig((_c) => ({
      ..._c,
      useCustomContentLocation: false,
      useStorageProvisionContentLocation: false,
    }))
    form.resetField('contentLocation')
  }, [form])

  const handleCustomMetadataLocationRemove = useCallback(() => {
    setFormConfig((_c) => ({
      ..._c,
      useCustomMetadataLocation: false,
      useStorageProvision: false,
    }))
    form.resetField('metadataLocation')
  }, [form])

  const handleCustomMetadataLocationCancel = useCallback(() => {
    setCustomMetadataLocationFormOpen(false)
  }, [])

  const handleCustomContentLocationCancel = useCallback(() => {
    setCustomContentLocationFormOpen(false)
  }, [])

  const handleCustomContentLocationEditStart = useCallback(() => {
    setCustomContentLocationFormOpen(true)
  }, [])

  const handleCustomMetadataLocationEditStart = useCallback(() => {
    setCustomMetadataLocationFormOpen(true)
  }, [])

  const handleCustomContentLocationSubmit = useCallback(
    (newCustomLocation: CustomLocationFormValues) => {
      form.setValue('contentLocation', newCustomLocation)
      setCustomContentLocationFormOpen(false)
      setFormConfig((_c) => ({
        ..._c,
        useCustomContentLocation: true,
        useStorageProvisionContentLocation: false,
      }))
    },
    [form],
  )

  const handleCustomMetadataLocationSubmit = useCallback(
    (newCustomLocation: CustomLocationFormValues) => {
      form.setValue('metadataLocation', newCustomLocation)
      setCustomMetadataLocationFormOpen(false)
      setFormConfig((_c) => ({
        ..._c,
        useCustomMetadataLocation: true,
        useStorageProvisionMetadataLocation: false,
      }))
    },
    [form],
  )
  return (
    <div className="flex flex-col gap-6 lg:min-w-[28rem] lg:max-w-[30rem]">
      <Form {...form}>
        <form className="space-y-4">
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
        </form>
      </Form>

      <div className="flex flex-col gap-3">
        <Form {...form}>
          <FormItem>
            <FormLabel>Content storage location</FormLabel>
            <FormDescription>
              Where this folder's content is stored
            </FormDescription>
          </FormItem>
        </Form>
        <div className="flex flex-col gap-4">
          {formConfig.useCustomContentLocation ? (
            <div>
              Using custom location{' '}
              <Button
                variant="link"
                onClick={handleCustomContentLocationRemove}
              >
                Remove
              </Button>
            </div>
          ) : formConfig.useStorageProvisionContentLocation ? (
            <div>
              Using storage provision content location
              <Button
                variant="link"
                onClick={handleStorageProvisionContentLocationRemove}
              >
                Remove
              </Button>
            </div>
          ) : customContentLocationFormOpen ? (
            <CustomLocationForm
              onCancel={handleCustomContentLocationCancel}
              // eslint-disable-next-line @typescript-eslint/require-await
              onSubmit={async (location) => {
                handleCustomContentLocationSubmit(location)
              }}
            />
          ) : (
            <StorageLocationDropdown
              storageProvisions={userStorageProvisions.filter((p) =>
                p.provisionTypes.includes('CONTENT'),
              )}
              onSelectCustom={handleCustomContentLocationEditStart}
              onSelectStorageProvision={
                handleContentLocationStorageProvisionSelection
              }
            />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Form {...form}>
          <FormItem>
            <FormLabel>Metadata storage location</FormLabel>
            <FormDescription>
              Where this folder's metadata is stored
            </FormDescription>
          </FormItem>
        </Form>
        <div className="flex flex-col gap-4">
          {formConfig.useCustomMetadataLocation ? (
            <div>
              Using custom location{' '}
              <Button
                variant="link"
                onClick={handleCustomMetadataLocationRemove}
              >
                Remove
              </Button>
            </div>
          ) : formConfig.useStorageProvisionMetadataLocation ? (
            <div>
              Using storage provision metadata location
              <Button
                variant="link"
                onClick={handleStorageProvisionMetadataLocationRemove}
              >
                Remove
              </Button>
            </div>
          ) : customMetadataLocationFormOpen ? (
            <CustomLocationForm
              onCancel={handleCustomMetadataLocationCancel}
              // eslint-disable-next-line @typescript-eslint/require-await
              onSubmit={async (location) => {
                handleCustomMetadataLocationSubmit(location)
              }}
            />
          ) : (
            <StorageLocationDropdown
              storageProvisions={userStorageProvisions.filter((p) =>
                p.provisionTypes.includes('METADATA'),
              )}
              onSelectCustom={handleCustomMetadataLocationEditStart}
              onSelectStorageProvision={
                handleMetadataLocationStorageProvisionSelection
              }
            />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant={'secondary'} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={(e) => {
            void form.trigger().then(() => {
              console.log(`${form.formState.isValid ? 'VALID' : 'INVALID'}:`, {
                values: form.getValues(),
                formState: form.formState,
                ...(!form.formState.isValid
                  ? { errors: form.formState.errors }
                  : {}),
              })
              if (form.formState.isValid) {
                void form.handleSubmit(onSubmit)(e)
              }
            })
          }}
          // disabled={form.formState.isSubmitting || form.formState.isSubmitted}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

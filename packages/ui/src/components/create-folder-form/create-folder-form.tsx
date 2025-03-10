import { XMarkIcon } from '@heroicons/react/24/outline'
import { zodResolver } from '@hookform/resolvers/zod'
import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { s3LocationSchema } from '@stellariscloud/types'
import {
  Badge,
  Button,
  cn,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@stellariscloud/ui-toolkit'
import { safeZodParse } from '@stellariscloud/utils'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import type { CustomLocationFormValues } from '../custom-location-form/custom-location-form'
import { CustomLocationForm } from '../custom-location-form/custom-location-form'
import { StorageLocationDropdown } from '../storage-location-dropdown/storage-location-dropdown'

const storageProvisionSelectionSchema = z.object({
  storageProvisionId: z.string(),
})

const storageProvisionDescriptionSchema =
  storageProvisionSelectionSchema.extend({
    label: z.string(),
  })
const formSchema = z.object({
  name: z.string().min(1, {
    message: 'Name must be at least 1 characters.',
  }),
  contentLocationStorageProvision: storageProvisionDescriptionSchema,
  metadataLocationStorageProvision: storageProvisionDescriptionSchema,
  contentLocation: s3LocationSchema.or(storageProvisionSelectionSchema),
  metadataLocation: s3LocationSchema.or(storageProvisionSelectionSchema),
})

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
    form.resetField('metadataLocationStorageProvision')
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
  const formValues = form.getValues()

  const serverProvisionMetadataLocationId = safeZodParse(
    formValues.metadataLocation,
    storageProvisionSelectionSchema,
  )
    ? formValues.metadataLocation.storageProvisionId
    : undefined

  const serverProvisionMetadataLocationLabel = serverProvisionMetadataLocationId
    ? (userStorageProvisions.find(
        (l) => (l.id = serverProvisionMetadataLocationId),
      )?.label ?? '')
    : ''
  const serverProvisionContentLocationId = safeZodParse(
    formValues.contentLocation,
    storageProvisionSelectionSchema,
  )
    ? formValues.contentLocation.storageProvisionId
    : undefined

  const serverProvisionContentLocationLabel = serverProvisionContentLocationId
    ? (userStorageProvisions.find(
        (l) => (l.id = serverProvisionContentLocationId),
      )?.label ?? '')
    : ''

  const metadataLocation = form.getValues().metadataLocation
  const customMetadataLocationDescription: string =
    formConfig.useCustomMetadataLocation &&
    safeZodParse(metadataLocation, s3LocationSchema)
      ? `${metadataLocation.endpoint}/${metadataLocation.bucket}${metadataLocation.prefix ? '/' : ''}${metadataLocation.prefix}`
      : ''

  const contentLocation = form.getValues().contentLocation
  const customContentLocationDescription: string =
    formConfig.useCustomContentLocation &&
    safeZodParse(contentLocation, s3LocationSchema)
      ? `${contentLocation.endpoint}/${contentLocation.bucket}${contentLocation.prefix ? '/' : ''}${contentLocation.prefix}`
      : ''

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

      <div
        className={cn(
          'flex flex-col',
          !customMetadataLocationFormOpen && !customContentLocationFormOpen
            ? 'gap-10'
            : '',
        )}
      >
        <div
          className={cn(
            !customMetadataLocationFormOpen ? '' : 'h-0 overflow-hidden',
            'flex flex-col gap-4 duration-200',
          )}
        >
          <div className="flex flex-col gap-4">
            <Form {...form}>
              <FormField
                control={form.control}
                name="contentLocation"
                render={() => (
                  <FormItem>
                    <div className="flex flex-col gap-1">
                      <FormLabel>Content storage location</FormLabel>
                      <FormDescription>
                        Where this folder's content is stored
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
            {formConfig.useCustomContentLocation ? (
              <div className="flex items-center">
                <Badge variant={'outline'} className="p-2 px-3">
                  {customContentLocationDescription}
                </Badge>
                <Button
                  variant="link"
                  onClick={handleCustomContentLocationRemove}
                >
                  <XMarkIcon className="size-4 opacity-50" />
                </Button>
              </div>
            ) : formConfig.useStorageProvisionContentLocation ? (
              <div className="flex items-center">
                <Badge variant={'outline'} className="p-2 px-3">
                  {serverProvisionContentLocationLabel}
                </Badge>
                <Button
                  variant="link"
                  onClick={handleStorageProvisionContentLocationRemove}
                >
                  <XMarkIcon className="size-4 opacity-50" />
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
              <div>
                <StorageLocationDropdown
                  storageProvisions={userStorageProvisions.filter((p) =>
                    p.provisionTypes.includes('CONTENT'),
                  )}
                  onSelectCustom={handleCustomContentLocationEditStart}
                  onSelectStorageProvision={
                    handleContentLocationStorageProvisionSelection
                  }
                />
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            !customContentLocationFormOpen ? '' : 'h-0 overflow-hidden',
            'flex flex-col gap-4 duration-200',
          )}
        >
          <Form {...form}>
            <FormField
              control={form.control}
              name="metadataLocation"
              render={() => (
                <FormItem>
                  <div className="flex flex-col gap-1">
                    <FormLabel>Metadata storage location</FormLabel>
                    <FormDescription>
                      Where this folder's metadata is stored
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
          {formConfig.useCustomMetadataLocation ? (
            <div className="flex items-center">
              <Badge variant={'outline'} className="p-2 px-3">
                {customMetadataLocationDescription}
              </Badge>
              <Button
                variant="link"
                onClick={handleCustomMetadataLocationRemove}
              >
                <XMarkIcon className="size-4 opacity-50" />
              </Button>
            </div>
          ) : formConfig.useStorageProvisionMetadataLocation ? (
            <div className="flex items-center">
              <Badge variant={'outline'} className="p-2 px-3">
                {serverProvisionMetadataLocationLabel}
              </Badge>
              <Button
                variant="link"
                onClick={handleStorageProvisionMetadataLocationRemove}
              >
                <XMarkIcon className="size-4 opacity-50" />
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
            <div>
              <StorageLocationDropdown
                storageProvisions={userStorageProvisions.filter((p) =>
                  p.provisionTypes.includes('METADATA'),
                )}
                onSelectCustom={handleCustomMetadataLocationEditStart}
                onSelectStorageProvision={
                  handleMetadataLocationStorageProvisionSelection
                }
              />
            </div>
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
              if (form.formState.isValid) {
                void form.handleSubmit(onSubmit)(e)
              } else {
                // TODO: make sure some feedback shows for all cases
              }
            })
          }}
          disabled={
            customContentLocationFormOpen || customContentLocationFormOpen
          }
        >
          Create
        </Button>
      </div>
    </div>
  )
}

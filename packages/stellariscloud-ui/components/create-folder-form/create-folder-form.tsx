import type {
  StorageProvisionDTO,
  StorageProvisionInputDTO,
} from '@stellariscloud/api-client'
import { FOLDER_NAME_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Button } from '../../design-system/button/button'
import { ButtonDropdown } from '../../design-system/button-dropdown/button-dropdown'
import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'
import type { StorageProvisionFormValues } from '../../views/server/server-storage-screen/server-storage-config/storage-provision-form/storage-provision-form-fields'
import { StorageProvisionFormFields } from '../../views/server/server-storage-screen/server-storage-config/storage-provision-form/storage-provision-form-fields'

interface CreateFolderFormValues {
  name: string
  contentLocation: StorageProvisionInputDTO
  metadataLocation: StorageProvisionInputDTO
}

const StorageProvisionRecord = r.Record({
  storageProvisionId: r.String,
})

const CustomLocationRecord = r.Record({
  endpoint: r.String,
  accessKeyId: r.String,
  secretAccessKey: r.String,
  region: r.String,
  prefix: r.String,
})

const UserLocationRecord = r.Record({
  userLocationId: r.String,
  userLocationBucketOverride: r.String,
  userLocationPrefixOverride: r.String,
})

export const CreateFolderForm = ({
  onSubmit,
  onCancel,
  storageProvisions: storageProvisions,
}: {
  onSubmit: (values: CreateFolderFormValues) => void
  onCancel: () => void
  storageProvisions: StorageProvisionDTO[]
}) => {
  const [newMetadataLocation, setNewMetadataLocation] = React.useState(false)
  const [newContentLocation, setNewContentLocation] = React.useState(false)
  const form = useFormState({
    name: { validator: FOLDER_NAME_VALIDATORS_COMBINED },
    contentLocation: {
      validator: UserLocationRecord.Or(StorageProvisionRecord).Or(
        CustomLocationRecord,
      ),
    },
    metadataLocation: {
      validator: UserLocationRecord.Or(StorageProvisionRecord)
        .Or(CustomLocationRecord)
        .optional(),
    },
  })

  const serverContentLocationValidation = StorageProvisionRecord.validate(
    form.values.contentLocation,
  )
  const selectedContentServerLocation = serverContentLocationValidation.success
    ? storageProvisions.find(
        (l) =>
          l.id === serverContentLocationValidation.value.storageProvisionId,
      )
    : undefined

  const serverMetadataLocationValidation = StorageProvisionRecord.validate(
    form.values.metadataLocation,
  )
  const selectedMetadataServerLocation =
    serverMetadataLocationValidation.success
      ? storageProvisions.find(
          (l) =>
            l.id === serverMetadataLocationValidation.value.storageProvisionId,
        )
      : undefined

  return (
    <div className="lg:min-w-[28rem] lg:max-w-[30rem] flex flex-col gap-4">
      <h3 className="font-bold text-gray-600 dark:text-gray-200 text-3xl mb">
        Create a new folder
      </h3>
      <div className="text-gray-600 dark:text-gray-400 font-medium mb-4">
        Folders refer to an arbitrary storage location, potentially already
        containing files
      </div>
      <Input
        label="Name"
        placeholder="Choose a meaningful name for the folder"
        error={
          !form.state.fields.name.valid
            ? form.state.fields.name.error
            : undefined
        }
        value={form.values.name}
        onChange={(e) => form.setValue('name', e.target.value)}
      />
      <div className="flex flex-col gap-4 justify-stretch">
        <h3 className="font-semibold dark:text-gray-200">
          <div className="flex justify-between">Content Location</div>
        </h3>
        {newContentLocation ? (
          <>
            <StorageProvisionFormFields
              onChange={({ value }) =>
                form.setValue(
                  'contentLocation',
                  value as StorageProvisionFormValues,
                )
              }
            />
            <Button onClick={() => setNewContentLocation(false)}>Cancel</Button>
          </>
        ) : (
          <ButtonDropdown
            label={
              selectedContentServerLocation
                ? selectedContentServerLocation.label
                : 'choose content location...'
            }
            items={storageProvisions
              .map((l) => ({
                name: l.label,
                onClick: () =>
                  form.setValue('contentLocation', {
                    storageProvisionId: l.id,
                  }),
              }))
              .concat([
                {
                  name: 'custom...',
                  onClick: () => setNewContentLocation(true),
                },
              ])}
          />
        )}
      </div>
      <div className="flex flex-col gap-4 justify-stretch">
        <h3 className="font-semibold dark:text-gray-200">
          <div className="flex justify-between">Metadata Location</div>
        </h3>

        {newMetadataLocation ? (
          <>
            <StorageProvisionFormFields
              onChange={({ value }) =>
                form.setValue(
                  'metadataLocation',
                  value as StorageProvisionFormValues,
                )
              }
            />
            <Button onClick={() => setNewMetadataLocation(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <ButtonDropdown
            label={
              selectedMetadataServerLocation
                ? selectedMetadataServerLocation.label
                : 'choose metadata location...'
            }
            items={storageProvisions
              .map((l) => ({
                name: l.label,
                onClick: () =>
                  form.setValue('metadataLocation', {
                    storageProvisionId: l.id,
                  }),
              }))
              .concat([
                {
                  name: 'add custom...',
                  onClick: () => setNewMetadataLocation(true),
                },
              ])}
          />
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          primary
          onClick={() => onSubmit(form.values as CreateFolderFormValues)}
          disabled={!form.state.valid}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

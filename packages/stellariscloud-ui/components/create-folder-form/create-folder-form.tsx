import type {
  UserStorageProvisionDTO,
  StorageLocationInputDTO,
} from '@stellariscloud/api-client'
import { FOLDER_NAME_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Button, Input, Label } from '@stellariscloud/ui-toolkit'
import { ButtonDropdown } from '../../design-system/button-dropdown/button-dropdown'
import { useFormState } from '../../utils/forms'
import { FolderLocationFormFields } from './folder-location-form-fields'
import type { FolderLocationFormValues } from './folder-location-form-fields'

interface CreateFolderFormValues {
  name: string
  contentLocation: StorageLocationInputDTO
  metadataLocation: StorageLocationInputDTO
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

export const CreateFolderForm = ({
  onSubmit,
  onCancel,
  userStorageProvisions,
}: {
  onSubmit: (values: CreateFolderFormValues) => void
  onCancel: () => void
  userStorageProvisions: UserStorageProvisionDTO[]
}) => {
  const [newMetadataLocation, setNewMetadataLocation] = React.useState(false)
  const [newContentLocation, setNewContentLocation] = React.useState(false)
  const form = useFormState({
    name: { validator: FOLDER_NAME_VALIDATORS_COMBINED },
    contentLocation: {
      validator: StorageProvisionRecord.Or(CustomLocationRecord),
    },
    metadataLocation: {
      validator: StorageProvisionRecord.Or(CustomLocationRecord).optional(),
    },
  })

  const serverContentLocationValidation = StorageProvisionRecord.validate(
    form.values.contentLocation,
  )
  const selectedContentServerLocation = serverContentLocationValidation.success
    ? userStorageProvisions.find(
        (l) =>
          l.id === serverContentLocationValidation.value.storageProvisionId,
      )
    : undefined

  const serverMetadataLocationValidation = StorageProvisionRecord.validate(
    form.values.metadataLocation,
  )
  const selectedMetadataServerLocation =
    serverMetadataLocationValidation.success
      ? userStorageProvisions.find(
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
      <div>
        <Label>Name</Label>
        <Input
          placeholder="Choose a meaningful name for the folder"
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-4 justify-stretch">
        <h3 className="font-semibold dark:text-gray-200">
          <div className="flex justify-between">Content Location</div>
        </h3>
        {newContentLocation ? (
          <>
            <FolderLocationFormFields
              onChange={({ value }) =>
                form.setValue(
                  'contentLocation',
                  value as FolderLocationFormValues,
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
            items={userStorageProvisions
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
            <FolderLocationFormFields
              onChange={({ value }) =>
                form.setValue(
                  'metadataLocation',
                  value as FolderLocationFormValues,
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
            items={userStorageProvisions
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
        <Button variant={'secondary'} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(form.values as CreateFolderFormValues)}
          disabled={!form.state.valid}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

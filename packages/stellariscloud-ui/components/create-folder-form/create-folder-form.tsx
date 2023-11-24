import type {
  ServerLocationData,
  ServerLocationType,
  UserLocationInputData,
} from '@stellariscloud/api-client'
import { FOLDER_NAME_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Button } from '../../design-system/button/button'
import { ButtonDropdown } from '../../design-system/button-dropdown/button-dropdown'
import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'
import type { LocationFormValues } from '../../views/server/server-storage-config/location-form-fields'
import { LocationFormFields } from '../../views/server/server-storage-config/location-form-fields'

interface CreateFolderFormValues {
  name: string
  contentLocation: UserLocationInputData
  metadataLocation?: UserLocationInputData
}

const ServerLocationRecord = r.Record({
  serverLocationId: r.String,
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
  serverLocations,
}: {
  onSubmit: (values: CreateFolderFormValues) => void
  onCancel: () => void
  serverLocations: {
    [ServerLocationType.Metadata]: ServerLocationData[]
    [ServerLocationType.Content]: ServerLocationData[]
    [ServerLocationType.Backup]: ServerLocationData[]
  }
}) => {
  // const [newMetadataLocation, setNewMetadataLocation] = React.useState(false)
  const [newContentLocation, setNewContentLocation] = React.useState(false)
  const form = useFormState({
    name: { validator: FOLDER_NAME_VALIDATORS_COMBINED },
    contentLocation: {
      validator:
        UserLocationRecord.Or(ServerLocationRecord).Or(CustomLocationRecord),
    },
    metadataLocation: {
      validator: UserLocationRecord.Or(ServerLocationRecord)
        .Or(CustomLocationRecord)
        .optional(),
    },
  })

  const serverContentLocationValidation = ServerLocationRecord.validate(
    form.values.contentLocation,
  )
  const selectedContentServerLocation = serverContentLocationValidation.success
    ? serverLocations.USER_CONTENT.find(
        (l) => l.id === serverContentLocationValidation.value.serverLocationId,
      )
    : undefined

  // const serverMetadataLocationValidation = ServerLocationRecord.validate(
  //   form.values.metadataLocation,
  // )
  // const selectedMetadataServerLocation =
  //   serverMetadataLocationValidation.success
  //     ? serverLocations.USER_METADATA.find(
  //         (l) =>
  //           l.id === serverMetadataLocationValidation.value.serverLocationId,
  //       )
  //     : undefined

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
            <LocationFormFields
              onChange={({ value }) =>
                form.setValue('contentLocation', value as LocationFormValues)
              }
            />
            <Button onClick={() => setNewContentLocation(false)}>Cancel</Button>
          </>
        ) : (
          <ButtonDropdown
            label={
              selectedContentServerLocation
                ? selectedContentServerLocation.name
                : 'choose content location...'
            }
            items={serverLocations.USER_CONTENT.map((l) => ({
              name: l.name,
              onClick: () =>
                form.setValue('contentLocation', { serverLocationId: l.id }),
            })).concat([
              {
                name: 'custom...',
                onClick: () => setNewContentLocation(true),
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

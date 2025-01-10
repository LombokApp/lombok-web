import type { UserStorageProvisionInputDTO } from '@stellariscloud/api-client'
import type { UserStorageProvisionType } from '@stellariscloud/types'
import { Button } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { UserStorageProvisionFormFields } from './user-storage-provision-form-fields'

export interface UserStorageProvisionFormValues {
  name: string
  prefix: string
  bucket: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  description: string
  label: string
  provisionTypes: UserStorageProvisionType[]
}

export const UserStorageProvisionForm = ({
  titleText = 'Create New User Storage Provision',
  submitText = 'Create',
  onSubmit,
  onCancel,
  value = {},
}: {
  titleText?: string
  submitText?: string
  onSubmit: (values: UserStorageProvisionFormValues) => void
  onCancel: () => void
  value?: Partial<UserStorageProvisionInputDTO>
}) => {
  const [userStorageProvision, setUserStorageProvision] = React.useState<{
    valid: boolean
    value: Partial<UserStorageProvisionFormValues>
  }>({ valid: false, value })

  return (
    <div className="flex size-full flex-col gap-4 rounded-lg bg-gray-50 p-6 py-10 dark:bg-white/5">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
        {titleText}
      </h2>
      <UserStorageProvisionFormFields
        secretAccessKeyObfuscated={false}
        value={value}
        onChange={(output) => setUserStorageProvision(output)}
      />
      <div className="flex justify-end gap-2">
        <Button variant={'secondary'} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSubmit(
              userStorageProvision.value as UserStorageProvisionFormValues,
            )
          }
          disabled={!userStorageProvision.valid}
        >
          <span className="capitalize">{submitText}</span>
        </Button>
      </div>
    </div>
  )
}

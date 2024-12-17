import type { UserStorageProvisionInputDTO } from '@stellariscloud/api-client'
import React from 'react'

import { Button } from '@stellariscloud/ui-toolkit'
import { UserStorageProvisionFormFields } from './user-storage-provision-form-fields'
import { UserStorageProvisionType } from '@stellariscloud/types'

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
    <div className="flex flex-col gap-4 w-full h-full bg-gray-50 dark:bg-white/5 p-6 py-10 rounded-lg">
      <h2 className="font-bold text-3xl text-gray-800 dark:text-gray-200">
        {titleText}
      </h2>
      <UserStorageProvisionFormFields
        secretAccessKeyObfuscated={false}
        value={value}
        onChange={(output) => setUserStorageProvision(output)}
      />
      <div className="flex gap-2 justify-end">
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

import type { StorageProvisionInputDTO } from '@stellariscloud/api-client'
import React from 'react'

import { Button } from '../../../../../design-system/button/button'
import { StorageProvisionFormFields } from './storage-provision-form-fields'
import { StorageProvisionType } from '@stellariscloud/types'

export interface StorageProvisionFormValues {
  name: string
  prefix: string
  bucket: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  description: string
  label: string
  provisionTypes: StorageProvisionType[]
}

export const StorageProvisionForm = ({
  titleText = 'Create New Storage Provision',
  submitText = 'Create',
  onSubmit,
  onCancel,
  value = {},
}: {
  titleText?: string
  submitText?: string
  onSubmit: (values: StorageProvisionFormValues) => void
  onCancel: () => void
  value?: Partial<StorageProvisionInputDTO>
}) => {
  const [storageProvision, setStorageProvision] = React.useState<{
    valid: boolean
    value: Partial<StorageProvisionFormValues>
  }>({ valid: false, value })

  return (
    <div className="flex flex-col gap-4 w-full h-full bg-gray-50 dark:bg-white/5 p-6 py-10 rounded-lg">
      <h2 className="font-bold text-3xl text-gray-800 dark:text-gray-200">
        {titleText}
      </h2>
      <StorageProvisionFormFields
        secretAccessKeyObfuscated={false}
        value={value}
        onChange={(output) => setStorageProvision(output)}
      />
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          primary
          onClick={() =>
            onSubmit(storageProvision.value as StorageProvisionFormValues)
          }
          disabled={!storageProvision.valid}
        >
          <span className="capitalize">{submitText}</span>
        </Button>
      </div>
    </div>
  )
}

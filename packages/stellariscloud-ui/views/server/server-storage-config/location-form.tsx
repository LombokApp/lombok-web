import type { ServerLocationData } from '@stellariscloud/api-client'
import React from 'react'

import { Button } from '../../../design-system/button/button'
import { LocationFormFields } from './location-form-fields'

export interface LocationFormValues {
  name: string
  prefix: string
  bucket: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

export const LocationForm = ({
  titleText = 'Create Location',
  submitText = 'Create',
  onSubmit,
  onCancel,
  value = {},
}: {
  titleText?: string
  submitText?: string
  onSubmit: (values: LocationFormValues) => void
  onCancel: () => void
  value?: Partial<ServerLocationData>
}) => {
  const [location, setLocation] = React.useState<{
    valid: boolean
    value: Partial<LocationFormValues>
  }>({ valid: false, value })

  return (
    <div className="flex flex-col gap-4 w-full h-full bg-gray-50 dark:bg-white/5 p-6 py-10 rounded-lg">
      <h2 className="font-bold text-3xl text-gray-800 dark:text-gray-200">
        {titleText}
      </h2>
      <LocationFormFields
        secretAccessKeyObfuscated={false}
        value={value}
        onChange={(output) => setLocation(output)}
      />
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          primary
          onClick={() => onSubmit(location.value as LocationFormValues)}
          disabled={!location.valid}
        >
          <span className="capitalize">{submitText}</span>
        </Button>
      </div>
    </div>
  )
}

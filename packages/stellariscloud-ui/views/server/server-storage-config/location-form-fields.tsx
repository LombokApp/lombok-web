import React from 'react'
import * as r from 'runtypes'

import { Input } from '../../../design-system/input/input'
import { useFormState } from '../../../utils/forms'

export interface LocationFormValues {
  name: string
  prefix: string
  bucket: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

export const LocationFormFields = ({
  onChange,
  value = {},
  secretAccessKeyObfuscated = false,
}: {
  onChange: (updatedFormValue: {
    valid: boolean
    value: Partial<LocationFormValues>
  }) => void
  value?: Partial<LocationFormValues>
  secretAccessKeyObfuscated?: boolean
}) => {
  const form = useFormState(
    {
      name: { validator: r.String },
      endpoint: { validator: r.String },
      bucket: { validator: r.String },
      prefix: { validator: r.String },
      region: { validator: r.String },
      accessKeyId: { validator: r.String },
      secretAccessKey: { validator: r.String.optional(), defaultValue: '' },
    },
    {},
    onChange,
  )

  return (
    <>
      <Input
        label="Name"
        value={form.values.name}
        onChange={(e) => form.setValue('name', e.target.value)}
        error={form.state.fields.name.error}
      />
      <Input
        label="Access Key ID"
        value={form.values.accessKeyId}
        onChange={(e) => form.setValue('accessKeyId', e.target.value)}
      />
      <Input
        label="Secret Access Key"
        disabled={secretAccessKeyObfuscated}
        value={
          secretAccessKeyObfuscated
            ? form.values.secretAccessKey ??
              '_______________________________________'
            : form.values.secretAccessKey
        }
        type={'password'}
        onChange={(e) => form.setValue('secretAccessKey', e.target.value)}
      />
      <Input
        label="Endpoint"
        value={form.values.endpoint}
        onChange={(e) => form.setValue('endpoint', e.target.value)}
      />
      <Input
        label="Region"
        value={form.values.region}
        onChange={(e) => form.setValue('region', e.target.value)}
      />
      <Input
        label="Bucket"
        value={form.values.bucket}
        onChange={(e) => form.setValue('bucket', e.target.value)}
      />
      <Input
        label="Prefix"
        value={form.values.prefix}
        onChange={(e) => form.setValue('prefix', e.target.value)}
      />
    </>
  )
}

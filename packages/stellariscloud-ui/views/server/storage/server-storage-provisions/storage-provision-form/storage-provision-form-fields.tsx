import React from 'react'
import * as r from 'runtypes'

import { Input } from '../../../../../design-system/input/input'
import { useFormState } from '../../../../../utils/forms'
import {
  StorageProvisionType,
  StorageProvisionTypeEnum,
} from '@stellariscloud/types'
import { Toggle } from '../../../../../design-system/toggle/toggle'

export interface StorageProvisionFormValues {
  name: string
  prefix: string
  bucket: string
  region: string
  description: string
  provisionTypes: StorageProvisionType[]
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

export const StorageProvisionFormFields = ({
  onChange,
  value = {},
  secretAccessKeyObfuscated = false,
}: {
  onChange: (updatedFormValue: {
    valid: boolean
    value: Partial<StorageProvisionFormValues>
  }) => void
  value?: Partial<StorageProvisionFormValues>
  secretAccessKeyObfuscated?: boolean
}) => {
  const form = useFormState(
    {
      label: { validator: r.String },
      description: { validator: r.String },
      endpoint: { validator: r.String },
      bucket: { validator: r.String },
      prefix: { validator: r.String },
      region: { validator: r.String },
      provisionTypes: {
        validator: r.Array(
          r.Union(
            r.Literal(StorageProvisionTypeEnum.CONTENT),
            r.Literal(StorageProvisionTypeEnum.BACKUP),
            r.Literal(StorageProvisionTypeEnum.METADATA),
          ),
        ),
      },
      accessKeyId: { validator: r.String },
      secretAccessKey: { validator: r.String.optional(), defaultValue: '' },
    },
    value,
    onChange,
  )

  return (
    <>
      <Input
        label="Name"
        value={form.values.label}
        onChange={(e) => form.setValue('label', e.target.value)}
        error={form.state.fields.label.error}
      />
      <Input
        label="Description"
        value={form.values.description}
        onChange={(e) => form.setValue('description', e.target.value)}
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
      <div className="flex gap-4 items-center text-white">
        {[
          StorageProvisionTypeEnum.BACKUP,
          StorageProvisionTypeEnum.CONTENT,
          StorageProvisionTypeEnum.METADATA,
        ].map((key: StorageProvisionType) => (
          <div key={`toggle_${key}`}>
            <Toggle
              label={key}
              value={!!form.values.provisionTypes?.includes(key)}
              onChange={(e) =>
                form.setValue(
                  'provisionTypes',
                  form.values.provisionTypes?.includes(key)
                    ? form.values.provisionTypes.filter((t) => t !== key)
                    : (form.values.provisionTypes ?? []).concat(key),
                )
              }
            />
          </div>
        ))}
      </div>
    </>
  )
}

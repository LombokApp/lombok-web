import type { UserStorageProvisionType } from '@stellariscloud/types'
import { UserStorageProvisionTypeEnum } from '@stellariscloud/types'
import { Input, Label, Switch } from '@stellariscloud/ui-toolkit'
import React from 'react'
import * as r from 'runtypes'

import { useFormState } from '../../../../../../utils/forms'

export interface UserStorageProvisionFormValues {
  label: string
  prefix: string
  bucket: string
  region: string
  description: string
  provisionTypes: UserStorageProvisionType[]
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}

export const UserStorageProvisionFormFields = ({
  onChange,
  value = {},
  secretAccessKeyObfuscated = false,
}: {
  onChange: (updatedFormValue: {
    valid: boolean
    value: Partial<UserStorageProvisionFormValues>
  }) => void
  value?: Partial<UserStorageProvisionFormValues>
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
            r.Literal(UserStorageProvisionTypeEnum.CONTENT),
            r.Literal(UserStorageProvisionTypeEnum.REDUNDANCY),
            r.Literal(UserStorageProvisionTypeEnum.METADATA),
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
      <div>
        <Label>Name</Label>
        <Input
          value={form.values.label}
          onChange={(e) => form.setValue('label', e.target.value)}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input
          value={form.values.description}
          onChange={(e) => form.setValue('description', e.target.value)}
        />
      </div>
      <div>
        <Label>Access Key ID</Label>
        <Input
          value={form.values.accessKeyId}
          onChange={(e) => form.setValue('accessKeyId', e.target.value)}
        />
      </div>
      <div>
        <Label>Secret Access Key</Label>
        <Input
          disabled={secretAccessKeyObfuscated}
          value={
            secretAccessKeyObfuscated
              ? (form.values.secretAccessKey ??
                '_______________________________________')
              : form.values.secretAccessKey
          }
          type={'password'}
          onChange={(e) => form.setValue('secretAccessKey', e.target.value)}
        />
      </div>
      <div>
        <Label>Endpoint</Label>
        <Input
          value={form.values.endpoint}
          onChange={(e) => form.setValue('endpoint', e.target.value)}
        />
      </div>
      <div>
        <Label>Region</Label>
        <Input
          value={form.values.region}
          onChange={(e) => form.setValue('region', e.target.value)}
        />
      </div>
      <div>
        <Label>Bucket</Label>
        <Input
          value={form.values.bucket}
          onChange={(e) => form.setValue('bucket', e.target.value)}
        />
      </div>
      <div>
        <Label>Prefix</Label>
        <Input
          value={form.values.prefix}
          onChange={(e) => form.setValue('prefix', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4 text-white">
        {[
          UserStorageProvisionTypeEnum.REDUNDANCY,
          UserStorageProvisionTypeEnum.CONTENT,
          UserStorageProvisionTypeEnum.METADATA,
        ].map((key: UserStorageProvisionType) => (
          <div key={`toggle_${key}`}>
            <Label>{key}</Label>
            <Switch
              checked={!!form.values.provisionTypes?.includes(key)}
              onCheckedChange={() =>
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

import { Input, Label } from '@stellariscloud/ui-toolkit'
import { NAME_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { useFormState } from '../../utils/forms'

export interface ProfileUserFormValues {
  id: string
  name: string
  username: string
  email: string
  password: string
}

export const ProfileUserForm = ({
  onChange,
  value = {},
}: {
  onChange: (updatedFormValue: {
    valid: boolean
    value: ProfileUserFormValues
  }) => void
  value?: Partial<ProfileUserFormValues>
}) => {
  const form = useFormState(
    {
      name: { validator: NAME_VALIDATORS_COMBINED },
      password: { validator: r.String.optional() },
    },
    value,
    onChange,
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Name</Label>
        <Input
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
        />
      </div>
      <div>
        <Label>Username</Label>
        <Input disabled value={value.username} />
      </div>
      <div>
        <Label>Email</Label>
        <Input disabled value={value.email} />
      </div>
      <div>
        <Label>{value.id ? 'Reset password' : 'Password'}</Label>
        <Input
          type="password"
          value={form.values.password}
          onChange={(e) => form.setValue('password', e.target.value)}
        />
      </div>
    </div>
  )
}

import { NAME_VALIDATORS_COMBINED } from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Input } from '../../design-system/input/input'
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
        <Input
          label="Name"
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
          error={form.state.fields.name.error}
        />
      </div>
      <div>
        <Input label="Username" disabled value={value.username} />
      </div>
      <div>
        <Input label="Email" disabled value={value.email} />
      </div>
      <div>
        <Input
          label={value.id ? 'Reset password' : 'Password'}
          type="password"
          value={form.values.password}
          onChange={(e) => form.setValue('password', e.target.value)}
          error={form.state.fields.password.error}
        />
      </div>
    </div>
  )
}

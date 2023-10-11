import {
  EMAIL_VALIDATORS_COMBINED,
  NAME_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { Input } from '../../design-system/input/input'
import { useFormState } from '../../utils/forms'
import { UserPermissions } from './user-permissions'

export interface UserFormValues {
  id: string
  name: string
  username: string
  email: string
  password: string
  emailVerified: boolean
  permissions: string[]
  roles: string[]
}

export const ServerUserForm = ({
  onChange,
  value = {},
}: {
  onChange: (updatedFormValue: {
    valid: boolean
    value: UserFormValues
  }) => void
  value?: Partial<UserFormValues>
}) => {
  const form = useFormState(
    {
      name: { validator: NAME_VALIDATORS_COMBINED },
      username: { validator: USERNAME_VALIDATORS_COMBINED },
      email: { validator: EMAIL_VALIDATORS_COMBINED },
      password: value.id
        ? { validator: r.String.optional() }
        : { validator: r.String },
      emailVerified: { validator: r.Boolean },
      permissions: { validator: r.Array(r.String) },
      roles: { validator: r.Array(r.String) },
    },
    value,
    onChange,
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Input
          label="Name"
          value={form.getValues().name}
          onChange={(e) => form.setValue('name', e.target.value)}
          error={form.state?.fields.name.error}
        />
      </div>
      <div>
        <Input
          label="Username"
          value={form.getValues().username}
          onChange={(e) => form.setValue('username', e.target.value)}
          error={form.state?.fields.username.error}
        />
      </div>
      <div>
        <Input
          label="Email"
          value={form.getValues().email}
          onChange={(e) => form.setValue('email', e.target.value)}
          error={form.state?.fields.email.error}
        />
      </div>
      <div>
        <Input
          label={value.id ? 'Reset password' : 'Password'}
          type="password"
          value={form.getValues().password}
          onChange={(e) => form.setValue('password', e.target.value)}
          error={form.state?.fields.password.error}
        />
      </div>
      <div>
        <UserPermissions
          onChange={(newValues) =>
            form.setValue('permissions', newValues.values)
          }
          values={form.getValues().permissions}
        />
      </div>
    </div>
  )
}

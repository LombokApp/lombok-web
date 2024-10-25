import {
  EMAIL_VALIDATORS_COMBINED,
  NAME_VALIDATORS_COMBINED,
  USERNAME_VALIDATORS_COMBINED,
} from '@stellariscloud/utils'
import React from 'react'
import * as r from 'runtypes'

import { useFormState } from '../../utils/forms'
import { UserPermissions } from './user-permissions'
import { Input, Label } from '@stellariscloud/ui-toolkit'

export interface UserInput {
  name?: string
  username?: string
  password?: string
  id?: string
  email?: string
  permissions?: string[]
  isAdmin: boolean
  emailVerified: boolean
}

export interface UserFormValues {
  id: string
  name: string
  username: string
  email: string
  password: string
  emailVerified: boolean
  isAdmin: boolean
  permissions: string[]
}

export const ServerUserForm = ({
  onChange,
  value = {
    id: '',
    username: '',
    email: '',
    password: '',
    name: '',
    emailVerified: false,
    permissions: [],
    isAdmin: false,
  },
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
      isAdmin: { validator: r.Boolean },
      permissions: { validator: r.Array(r.String) },
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
        <Input
          value={form.values.username}
          onChange={(e) => form.setValue('username', e.target.value)}
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          value={form.values.email}
          onChange={(e) => form.setValue('email', e.target.value)}
        />
      </div>
      <div>
        <Label>{value.id ? 'Reset password' : 'Password'}</Label>
        <Input
          type="password"
          value={form.values.password}
          onChange={(e) => form.setValue('password', e.target.value)}
        />
      </div>
      <div>
        <UserPermissions
          onChange={(newValues) =>
            form.setValue('permissions', newValues.values)
          }
          values={form.values.permissions}
        />
      </div>
    </div>
  )
}

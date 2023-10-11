import React from 'react'
import * as r from 'runtypes'

import { Button } from '../../design-system/button/button'
import { Toggle } from '../../design-system/toggle/toggle'
import { useFormState } from '../../utils/forms'
import { UserPermissions } from '../server-user-form/user-permissions'

export interface ServerSettingsFormValues {
  SIGNUP_PERMISSIONS: string[]
  SIGNUP_ENABLED: boolean
}

export const ServerSettingsForm = ({
  onChange,
  formValue,
  onSubmit,
  onReset,
}: {
  onReset: () => void
  onChange: (updatedFormValue: {
    valid: boolean
    value: ServerSettingsFormValues
  }) => void
  onSubmit: (updatedFormValue: {
    valid: boolean
    values: ServerSettingsFormValues
  }) => void
  formValue: Partial<ServerSettingsFormValues>
}) => {
  const [fieldConfigs, _setFieldConfigs] = React.useState({
    SIGNUP_PERMISSIONS: {
      validator: r.Array(r.String),
      currentValue: formValue.SIGNUP_PERMISSIONS,
      defaultValue: [],
    },
    SIGNUP_ENABLED: {
      validator: r.Boolean,
      currentValue: formValue.SIGNUP_ENABLED,
      defaultValue: false,
    },
  })

  const form = useFormState(fieldConfigs, formValue, onChange)

  const SETTINGS_SECTIONS = [
    {
      title: 'Signup Enabled',
      component: () => (
        <div>
          <Toggle
            label="Signup Enabled"
            name={'SIGNUP_ENABLED'}
            onChange={(newValue) => form.setValue('SIGNUP_ENABLED', newValue)}
            value={form.getValues().SIGNUP_ENABLED}
          />
        </div>
      ),
    },
    {
      title: 'Signup permissions',
      component: () => (
        <div>
          <UserPermissions
            onChange={(newValues) =>
              form.setValue('SIGNUP_PERMISSIONS', newValues.values)
            }
            values={form.getValues().SIGNUP_PERMISSIONS}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {SETTINGS_SECTIONS.map(({ component: Component }, i) => (
        <Component key={i} />
      ))}
      <div>
        <div className="flex gap-2">
          <Button onClick={onReset}>
            <span className="capitalize">Reset</span>
          </Button>
          <Button
            primary
            onClick={() =>
              onSubmit({
                valid: form.state?.valid ?? false,
                values: form.getValues(),
              })
            }
            disabled={!form.state?.valid}
          >
            <span className="capitalize">Save</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

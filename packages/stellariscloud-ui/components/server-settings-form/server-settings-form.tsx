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
      description:
        'Disabling this prevents users from signing up on this server.',
      component: () => (
        <div>
          <Toggle
            name={'SIGNUP_ENABLED'}
            onChange={(newValue) => form.setValue('SIGNUP_ENABLED', newValue)}
            value={form.values.SIGNUP_ENABLED ?? false}
          />
        </div>
      ),
    },
    {
      title: 'Signup Permissions',
      description:
        'These permissions are assigned by default to a user when the signup.',
      component: () => (
        <div>
          <UserPermissions
            onChange={(newValues) =>
              form.setValue('SIGNUP_PERMISSIONS', newValues.values)
            }
            values={form.values.SIGNUP_PERMISSIONS}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        {SETTINGS_SECTIONS.map(
          ({ component: Component, title, description }, i) => (
            <div
              key={i}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                {title}
                <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                  {description}
                </div>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <Component key={i} />
              </dd>
            </div>
          ),
        )}
      </dl>
      <div>
        <div className="flex gap-2">
          <Button onClick={onReset}>
            <span className="capitalize">Reset</span>
          </Button>
          <Button
            primary
            onClick={() =>
              onSubmit({
                valid: form.state.valid,
                values: form.values as ServerSettingsFormValues,
              })
            }
            disabled={!form.state.valid}
          >
            <span className="capitalize">Save</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

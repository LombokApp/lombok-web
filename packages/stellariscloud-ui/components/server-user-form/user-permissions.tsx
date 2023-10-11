import React from 'react'

import { Toggle } from '../../design-system/toggle/toggle'

const PERMISSIONS = ['one_permission', 'two_permission']

export const UserPermissions = ({
  onChange,
  values = [],
}: {
  onChange: (updatedFormValue: { valid: boolean; values: string[] }) => void
  values?: string[]
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
        Permissions
      </div>
      <div className="flex flex-wrap gap-8">
        {PERMISSIONS.map((perm, i) => (
          <div key={i} className="flex gap-2 items-center min-w-[12rem]">
            <Toggle
              value={values.includes(perm)}
              onChange={(newValue) => {
                const isEnabled = !newValue
                onChange({
                  valid: true,
                  values: isEnabled
                    ? values.filter((v) => v !== perm)
                    : values.concat([perm]),
                })
              }}
            />
            <div className="text-gray-800 dark:text-gray-200">{perm}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

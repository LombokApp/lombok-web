import { Switch } from '@stellariscloud/ui-toolkit'

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
      <div className="flex flex-wrap gap-8">
        {PERMISSIONS.map((perm, i) => (
          <div key={i} className="flex min-w-48 items-center gap-2">
            <Switch
              checked={values.includes(perm)}
              onCheckedChange={(newValue) => {
                const isEnabled = !newValue
                onChange({
                  valid: true,
                  values: isEnabled
                    ? values.filter((v) => v !== perm)
                    : values.concat([perm]),
                })
              }}
            />
            <div>{perm}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import type { CreateUserFormValues } from '../../../../components/server-user-form/server-user-form'
import { ServerUserForm } from '../../../../components/server-user-form/server-user-form'
import { apiClient } from '../../../../services/api'

export function ServerUserCreatePanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancel,
}: {
  onCancel: () => undefined
}) {
  const navigate = useNavigate()

  const handleSubmitClick = React.useCallback(
    (values: CreateUserFormValues) => {
      return apiClient.usersApi
        .createUser({
          userCreateInputDTO: values,
        })
        .then(({ data }) => {
          void navigate(`/server/users/${data.user.id}`)
        })
    },
    [navigate],
  )

  return (
    <div
      className={cn(
        'flex h-full flex-1 flex-col items-center gap-6 overflow-y-auto',
      )}
    >
      <div className="inline-block min-w-full py-2 align-middle">
        <ServerUserForm onSubmit={handleSubmitClick} />
      </div>
    </div>
  )
}

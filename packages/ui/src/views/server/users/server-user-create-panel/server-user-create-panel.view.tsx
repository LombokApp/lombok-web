import type { UserCreateInputDTO } from '@stellariscloud/api-client'
import { Button, cn } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import type { UserInput } from '../../../../components/server-user-form/server-user-form'
import { ServerUserForm } from '../../../../components/server-user-form/server-user-form'
import { apiClient } from '../../../../services/api'

const buildInitialUserObject = () => {
  return {
    username: '',
    email: '',
    name: '',
    permissions: [],
    id: undefined,
    password: '',
    emailVerified: false,
    isAdmin: false,
  }
}
export function ServerUserCreatePanel({
  onCancel,
}: {
  onCancel: () => undefined
}) {
  const navigate = useNavigate()
  const [userObject, setUserObject] = React.useState<UserInput>(
    buildInitialUserObject(),
  )

  const handleSubmitClick = React.useCallback(() => {
    void apiClient.usersApi
      .createUser({
        userCreateInputDTO: userObject as UserCreateInputDTO,
      })
      .then(({ data }) => {
        void navigate(`/server/users/${data.user.id}`)
      })
  }, [navigate, userObject])

  const handleCancelClick = React.useCallback(() => {
    setUserObject(buildInitialUserObject())
    onCancel()
  }, [onCancel])

  return (
    <div
      className={cn(
        'flex h-full flex-1 flex-col items-center gap-6 overflow-y-auto',
      )}
    >
      <div className="inline-block min-w-full py-2 align-middle">
        <ServerUserForm
          onChange={(changedUser) => setUserObject(changedUser.value)}
          value={userObject}
        />
        <div className="flex gap-2 py-4">
          <Button variant={'secondary'} onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button onClick={handleSubmitClick}>Create</Button>
        </div>
      </div>
    </div>
  )
}

import type { UserCreateInputDTO } from '@stellariscloud/api-client'
import { Button, cn } from '@stellariscloud/ui-toolkit'
import { useRouter } from 'next/router'
import React from 'react'

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
  const router = useRouter()
  const [userObject, setUserObject] = React.useState<UserInput>(
    buildInitialUserObject(),
  )

  const handleSubmitClick = React.useCallback(() => {
    void apiClient.usersApi
      .createUser({
        userCreateInputDTO: userObject as UserCreateInputDTO,
      })
      .then(({ data }) => {
        void router.push(`/server/users/${data.user.id}`)
      })
  }, [router, userObject])

  const handleCancelClick = React.useCallback(() => {
    setUserObject(buildInitialUserObject())
    onCancel()
  }, [onCancel])

  return (
    <div
      className={cn(
        'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
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

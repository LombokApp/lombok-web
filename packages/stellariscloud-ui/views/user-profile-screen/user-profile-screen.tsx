import type { UserDTO } from '@stellariscloud/api-client'
import type { NullablePartial } from '@stellariscloud/utils'
import React from 'react'

import type { ProfileUserFormValues } from '../../components/profile-user-form/profile-user-form'
import { ProfileUserForm } from '../../components/profile-user-form/profile-user-form'
import { apiClient } from '../../services/api'
import { Button, TypographyH2, cn } from '@stellariscloud/ui-toolkit'

export function UserProfileScreen() {
  const [user, setUser] = React.useState<UserDTO>()
  const [userFormState, setUserFormState] =
    React.useState<NullablePartial<ProfileUserFormValues>>()

  React.useEffect(() => {
    void apiClient.viewerApi.getViewer().then((u) => {
      setUser(u.data.user)
      setUserFormState({
        password: '',
        name: u.data.user.name ?? '',
        username: u.data.user.username ?? '',
        email: u.data.user.email ?? '',
        id: u.data.user.id,
      })
    })
  }, [])

  const handleSubmitClick = React.useCallback(() => {
    void apiClient.viewerApi.updateViewer({
      viewerUpdateInputDTO: {
        name: userFormState?.name ?? '',
      },
    })
  }, [userFormState])

  return (
    <div className={cn('items-center flex flex-1 flex-col h-full')}>
      <div className="container flex-1 flex flex-col">
        <div className="p-4">
          <TypographyH2>
            {user
              ? [
                  `Server User: ${user.username ? user.username : user.email ? user.email : user.id}`,
                ]
              : ['Server User:']}
          </TypographyH2>
        </div>
        <div className="inline-block min-w-full py-2 align-middle">
          <ProfileUserForm
            onChange={(changedUser) => setUserFormState(changedUser.value)}
            value={userFormState}
          />
          <div className="py-4">
            <Button onClick={handleSubmitClick}>Update</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

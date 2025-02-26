import type { UserDTO } from '@stellariscloud/api-client'
import { cn, TypographyH2 } from '@stellariscloud/ui-toolkit'
import type { NullablePartial } from '@stellariscloud/utils'
import React from 'react'

import type { ProfileUserFormValues } from '../../components/profile-user-form/profile-user-form'
import { ProfileUserForm } from '../../components/profile-user-form/profile-user-form'
import { apiClient } from '../../services/api'

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
        username: u.data.user.username,
        email: u.data.user.email,
        // id: u.data.user.id,
        confirmPassword: '',
      })
    })
  }, [])

  const handleSubmitClick = React.useCallback(
    async (values: ProfileUserFormValues) => {
      await apiClient.viewerApi.updateViewer({ viewerUpdateInputDTO: values })
    },
    [],
  )

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
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
          <ProfileUserForm onSubmit={handleSubmitClick} value={userFormState} />
        </div>
      </div>
    </div>
  )
}

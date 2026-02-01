import type { UserDTO } from '@lombokapp/types'
import { Card, CardContent } from '@lombokapp/ui-toolkit/components/card'
import type { NullablePartial } from '@lombokapp/utils'
import React from 'react'

import { $api } from '@/src/services/api'

import type { ProfileUserFormValues } from '../../components/profile-user-form/profile-user-form'
import { ProfileUserForm } from '../../components/profile-user-form/profile-user-form'

export function UserProfileScreen() {
  const [user, setUser] = React.useState<UserDTO>()
  const [userFormState, setUserFormState] =
    React.useState<NullablePartial<ProfileUserFormValues>>()

  const getViewerQuery = $api.useQuery('get', '/api/v1/viewer')

  React.useEffect(() => {
    if (getViewerQuery.data) {
      setUser(getViewerQuery.data.user)
      setUserFormState({
        password: '',
        name: getViewerQuery.data.user.name ?? '',
        username: getViewerQuery.data.user.username,
        email: getViewerQuery.data.user.email ?? '',
        confirmPassword: '',
      })
    }
  }, [getViewerQuery.data])

  const updateViewerMutation = $api.useMutation('put', '/api/v1/viewer')
  const handleSubmitClick = React.useCallback(
    async (values: ProfileUserFormValues) => {
      await updateViewerMutation.mutateAsync({
        body: values,
      })
    },
    [updateViewerMutation],
  )

  return (
    <div className="flex h-full max-h-full flex-1 flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile information.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-1 flex-col">
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.username}
            </h1>
            <div className="inline-block min-w-full py-2 align-middle">
              <ProfileUserForm
                onSubmit={handleSubmitClick}
                value={userFormState}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

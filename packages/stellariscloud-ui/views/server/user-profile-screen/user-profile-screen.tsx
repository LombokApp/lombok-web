import type { UserData } from '@stellariscloud/api-client'
import type { NullablePartial } from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import type { ProfileUserFormValues } from '../../../components/profile-user-form/profile-user-form'
import { ProfileUserForm } from '../../../components/profile-user-form/profile-user-form'
import { Button } from '../../../design-system/button/button'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import { viewerApi } from '../../../services/api'

export function UserProfileScreen() {
  const [user, setUser] = React.useState<UserData>()
  const [userFormState, setUserFormState] =
    React.useState<NullablePartial<ProfileUserFormValues>>()

  React.useEffect(() => {
    void viewerApi.getViewer().then((u) => {
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
    void viewerApi.updateViewer({
      viewerUpdatePayload: {
        name: userFormState?.name ?? '',
      },
    })
  }, [userFormState])

  return (
    <>
      <div
        className={clsx(
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <div className="py-4 flex items-start gap-10">
            <PageHeading
              titleIconBg={'bg-amber-100'}
              avatarKey={user?.id ?? undefined}
              title={['Profile', user?.username ?? '']}
            />
          </div>
          <div className="pt-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <ProfileUserForm
                onChange={(changedUser) => setUserFormState(changedUser.value)}
                value={userFormState}
              />
              <div className="py-4">
                <Button primary onClick={handleSubmitClick}>
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

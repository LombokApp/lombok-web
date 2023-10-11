import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerUserForm } from '../../../components/server-user-form/server-user-form'
import { Button } from '../../../design-system/button/button'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import { serverApi } from '../../../services/api'
import { ServerTabs } from '../server-tabs'

interface CreateUserInput {
  username: string
  password: string
  email: string
  permissions: string[]
}

interface UserInput {
  name?: string
  username?: string
  password?: string
  id?: string
  email?: string
  permissions?: string[]
}

export function ServerUserDetailScreen({
  userId,
  user,
}: {
  userId?: string
  user: UserInput
}) {
  const isNew = !userId
  const router = useRouter()
  const [userObject, setUserObject] = React.useState<UserInput>({
    username: user.username ?? '',
    email: user.email ?? '',
    permissions: user.permissions ?? [],
    id: user.id,
    password: user.password ?? '',
  })

  const handleSubmitClick = React.useCallback(() => {
    if (isNew) {
      void serverApi
        .createUser({
          createUserData: userObject as CreateUserInput,
        })
        .then(({ data }) => {
          void router.push(`/server/users/${data.user.id}`)
        })
    } else {
      void serverApi
        .updateUser({
          userId,
          updateUserData: {
            ...userObject,
          },
        })
        .then(({ data }) => {
          void router.push(`/server/users/${data.user.id}`)
        })
    }
  }, [userId, isNew, router, userObject])

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
              avatarKey={userId}
              title={['Server', 'Users', userId ?? 'New']}
            />
          </div>
          <div className="pb-6">
            <ServerTabs activeTab={'users'} />
          </div>
          <div className="pt-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <ServerUserForm
                onChange={(changedUser) => setUserObject(changedUser.value)}
                value={user}
              />
              <div className="py-4">
                <Button primary onClick={handleSubmitClick}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

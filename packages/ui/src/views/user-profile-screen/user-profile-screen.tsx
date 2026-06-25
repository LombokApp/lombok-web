import type { UserDTO } from '@lombokapp/types'
import { Card, CardContent } from '@lombokapp/ui-toolkit/components/card'
import type { NullablePartial } from '@lombokapp/utils'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { $api, $apiClient } from '@/src/services/api'
import { stageUpload } from '@/src/services/staging-upload'

import { ImageUploader } from '../../components/image-uploader/image-uploader'
import type { ProfileUserFormValues } from '../../components/profile-user-form/profile-user-form'
import { ProfileUserForm } from '../../components/profile-user-form/profile-user-form'

export function UserProfileScreen() {
  const [user, setUser] = React.useState<UserDTO>()
  const [userFormState, setUserFormState] =
    React.useState<NullablePartial<ProfileUserFormValues>>()

  const getViewerQuery = $api.useQuery('get', '/api/v1/viewer')
  const queryClient = useQueryClient()

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

  const invalidateViewer = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/viewer'],
    })
  }, [queryClient])

  const handleAvatarUpload = React.useCallback(
    async (file: File) => {
      const stagingKey = await stageUpload(file, 'user-avatar')
      const { response } = await $apiClient.POST('/api/v1/viewer/avatar', {
        body: { stagingKey },
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string
        }
        throw Object.assign(new Error('Upload failed'), {
          status: response.status,
          message: body.message ?? 'Upload failed',
        })
      }
      await invalidateViewer()
    },
    [invalidateViewer],
  )

  const handleAvatarDelete = React.useCallback(async () => {
    const { response } = await $apiClient.DELETE('/api/v1/viewer/avatar')
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string
      }
      throw Object.assign(new Error('Delete failed'), {
        status: response.status,
        message: body.message ?? 'Delete failed',
      })
    }
    await invalidateViewer()
  }, [invalidateViewer])

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
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-medium">Profile photo</h2>
                <p className="text-sm text-muted-foreground">
                  Shown across your account and the spaces you share.
                </p>
              </div>
              <ImageUploader
                kind="user"
                name={user?.name ?? user?.username}
                image={user?.avatar}
                onUpload={handleAvatarUpload}
                onDelete={handleAvatarDelete}
              />
            </div>
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

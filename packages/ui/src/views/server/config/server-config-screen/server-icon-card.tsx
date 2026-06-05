import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card/card'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { ImageUploader } from '@/src/components/image-uploader/image-uploader'
import { usePublicSettingsContext } from '@/src/contexts/public-settings'
import { $apiClient } from '@/src/services/api'

export function ServerIconCard() {
  const { settings, refetch } = usePublicSettingsContext()
  const queryClient = useQueryClient()

  const invalidate = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/public/settings'],
    })
    refetch()
  }, [queryClient, refetch])

  const handleUpload = React.useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { response } = await $apiClient.POST('/api/v1/server/icon', {
        body: formData as unknown as undefined,
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
      await invalidate()
    },
    [invalidate],
  )

  const handleDelete = React.useCallback(async () => {
    const { response } = await $apiClient.DELETE('/api/v1/server/icon')
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string
      }
      throw Object.assign(new Error('Delete failed'), {
        status: response.status,
        message: body.message ?? 'Delete failed',
      })
    }
    await invalidate()
  }, [invalidate])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server icon</CardTitle>
        <CardDescription>
          Replaces the default Lombok logo on the login, header, and sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ImageUploader
          kind="folder"
          name="Server"
          image={settings?.serverIcon}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />
        <p className="text-xs text-muted-foreground">
          Large source images are cropped and compressed in your browser before
          upload.
        </p>
      </CardContent>
    </Card>
  )
}

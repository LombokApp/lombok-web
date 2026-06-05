import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog/dialog'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { $apiClient } from '@/src/services/api'

import type { ImageUrls } from '../entity-avatar/entity-avatar'
import { ImageUploader } from '../image-uploader/image-uploader'

interface FolderIconModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId: string
  folderName: string
  icon?: ImageUrls
}

export function FolderIconModal({
  open,
  onOpenChange,
  folderId,
  folderName,
  icon,
}: FolderIconModalProps) {
  const queryClient = useQueryClient()

  const invalidateFolder = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        'get',
        '/api/v1/folders/{folderId}',
        { params: { path: { folderId } } },
      ],
    })
    await queryClient.invalidateQueries({
      queryKey: ['get', '/api/v1/folders'],
    })
  }, [queryClient, folderId])

  const handleUpload = React.useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { response } = await $apiClient.POST(
        '/api/v1/folders/{folderId}/icon',
        {
          params: { path: { folderId } },
          body: formData as unknown as undefined,
        },
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string
        }
        throw Object.assign(new Error('Upload failed'), {
          status: response.status,
          message: body.message ?? 'Upload failed',
        })
      }
      await invalidateFolder()
    },
    [folderId, invalidateFolder],
  )

  const handleDelete = React.useCallback(async () => {
    const { response } = await $apiClient.DELETE(
      '/api/v1/folders/{folderId}/icon',
      {
        params: { path: { folderId } },
      },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string
      }
      throw Object.assign(new Error('Delete failed'), {
        status: response.status,
        message: body.message ?? 'Delete failed',
      })
    }
    await invalidateFolder()
  }, [folderId, invalidateFolder])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Folder icon</DialogTitle>
          <DialogDescription>
            Set a custom icon for {folderName}. It’s cropped to a square.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <ImageUploader
            kind="folder"
            name={folderName}
            image={icon}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

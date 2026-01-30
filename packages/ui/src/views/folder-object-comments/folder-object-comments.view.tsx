import { CardContent, CardHeader } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import { useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import React from 'react'

import { CommentsList } from '@/src/components/comments/comments-list'
import {
  DeleteCommentModal,
  type DeleteCommentModalData,
} from '@/src/components/comments/delete-comment-modal'
import { $api } from '@/src/services/api'

export const FolderObjectComments = ({
  folderId,
  folderObjectId,
}: {
  folderId: string
  folderObjectId: string
}) => {
  const [deleteModalData, setDeleteModalData] =
    React.useState<DeleteCommentModalData>({
      isOpen: false,
    })

  const queryClient = useQueryClient()
  const viewerQuery = $api.useQuery('get', '/api/v1/viewer')
  const currentUserId = viewerQuery.data?.user.id

  const deleteCommentMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
    {
      onSuccess: () => {
        // Invalidate all comment queries for this folder object
        // Use predicate to match any query that includes the comments path
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey
            if (!Array.isArray(queryKey) || queryKey.length < 2) {
              return false
            }
            return !!queryKey.find(
              (q) =>
                q ===
                `/api/v1/folders/{folderId}/objects/{folderObjectId}/comments`,
            )
          },
        })
      },
    },
  )

  const handleDeleteClick = (commentId: string) => {
    setDeleteModalData({
      isOpen: true,
      commentId,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModalData.commentId) {
      return
    }
    await deleteCommentMutation.mutateAsync({
      params: {
        path: {
          folderId,
          folderObjectId,
          commentId: deleteModalData.commentId,
        },
      },
    })
  }

  return (
    <Card className="shrink-0">
      <CardHeader className="p-4 pt-3">
        <div className="flex items-center justify-between">
          <TypographyH3>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-6" />
              Comments
            </div>
          </TypographyH3>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <CommentsList
          folderId={folderId}
          folderObjectId={folderObjectId}
          currentUserId={currentUserId}
          onDelete={handleDeleteClick}
        />
      </CardContent>
      <DeleteCommentModal
        modalData={deleteModalData}
        setModalData={setDeleteModalData}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  )
}

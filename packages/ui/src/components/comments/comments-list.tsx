import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { X } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

import type { CommentAnchorType, CommentData } from './comment.types'
import { CommentForm } from './comment-form'
import { CommentItem } from './comment-item'

interface CommentsListProps {
  folderId: string
  folderObjectId: string
  currentUserId?: string
  onDelete?: (commentId: string) => void
}

export const CommentsList = ({
  folderId,
  folderObjectId,
  currentUserId,
  onDelete,
}: CommentsListProps) => {
  const [quotedCommentId, setQuotedCommentId] = React.useState<
    string | undefined
  >(undefined)
  const [quotedCommentIndex, setQuotedCommentIndex] = React.useState<
    number | undefined
  >(undefined)
  const allCommentsQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
    {
      params: {
        path: { folderId, folderObjectId },
      },
    },
  )

  const allComments =
    (allCommentsQuery.data as { comments?: CommentData[] } | undefined)
      ?.comments ?? []

  const isLoading = allCommentsQuery.isLoading

  const createCommentMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
    {
      onSuccess: () => {
        void allCommentsQuery.refetch()
        setQuotedCommentId(undefined)
        setQuotedCommentIndex(undefined)
      },
    },
  )

  const addReactionMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions',
    {
      onSuccess: () => {
        void allCommentsQuery.refetch()
      },
    },
  )

  const removeReactionMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions/{emoji}',
    {
      onSuccess: () => {
        void allCommentsQuery.refetch()
      },
    },
  )

  const handleReaction = (commentId: string, emoji: string) => {
    const comment = allComments.find((c) => c.id === commentId)
    if (!comment) {
      return
    }

    // Check if user already has this reaction
    const reaction = comment.reactions?.find((r) => r.emoji === emoji)
    const hasReaction = reaction?.users.some((u) => u.id === currentUserId)

    if (hasReaction) {
      // Remove reaction
      removeReactionMutation.mutate({
        params: {
          path: {
            folderId,
            folderObjectId,
            commentId,
            emoji: encodeURIComponent(emoji),
          },
        },
      })
    } else {
      // Add reaction
      addReactionMutation.mutate({
        params: {
          path: {
            folderId,
            folderObjectId,
            commentId,
          },
        },
        body: {
          emoji,
        },
      })
    }
  }

  const handleQuote = (commentId: string) => {
    // Only allow quoting root comments
    const comment = allComments.find((c) => c.id === commentId)
    if (comment?.rootId === null) {
      const index = allComments.findIndex((c) => c.id === commentId)
      if (index !== -1) {
        setQuotedCommentId(commentId)
        setQuotedCommentIndex(index)
      }
    }
  }

  const handleCancelQuote = () => {
    setQuotedCommentId(undefined)
    setQuotedCommentIndex(undefined)
  }

  const handleSubmit = (content: string, anchor?: CommentAnchorType) => {
    // Always create root comments (top-level comments in the main/default thread)
    // Quotes can reference other root comments
    createCommentMutation.mutate({
      params: {
        path: { folderId, folderObjectId },
      },
      body: {
        content,
        anchor: anchor ?? undefined,
        quoteId: quotedCommentId,
      },
    })
  }

  // Determine which comments to show
  const visibleComments =
    quotedCommentIndex !== undefined
      ? allComments.slice(0, quotedCommentIndex + 1)
      : allComments

  const hiddenCommentsCount =
    quotedCommentIndex !== undefined
      ? allComments.length - quotedCommentIndex - 1
      : 0

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-20 w-full animate-pulse rounded-md bg-foreground/5" />
        <div className="h-20 w-full animate-pulse rounded-md bg-foreground/5" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {visibleComments.map((comment) => (
        <div
          key={comment.id}
          className="transition-all duration-300 ease-in-out"
        >
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            onDelete={onDelete}
            onQuote={handleQuote}
            onReaction={handleReaction}
          />
          {quotedCommentId === comment.id && (
            <div className="animate-in fade-in slide-in-from-top-2 mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Quoting @{comment.author.username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelQuote}
                  className="size-6 p-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <CommentForm
                onSubmit={handleSubmit}
                placeholder="Write a comment..."
                submitLabel="Post"
                showAnchorInput={false}
              />
            </div>
          )}
        </div>
      ))}

      {hiddenCommentsCount > 0 && (
        <div className="overflow-hidden text-center text-xs text-muted-foreground transition-all duration-300">
          {hiddenCommentsCount} comment{hiddenCommentsCount !== 1 ? 's' : ''}{' '}
          hidden
        </div>
      )}

      {!quotedCommentId && (
        <div className="mt-2 rounded-md border border-foreground/10 bg-foreground/[.01] p-3">
          <CommentForm
            onSubmit={handleSubmit}
            placeholder="Write a comment..."
            submitLabel="Post"
            showAnchorInput={false}
          />
        </div>
      )}
    </div>
  )
}

import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@lombokapp/ui-toolkit/components/collapsible'
import { MessageSquare } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

import { CommentForm } from './comment-form'
import { CommentItem } from './comment-item'

interface CommentData {
  id: string
  rootId: string | null
  quoteId: string | null
  author: {
    id: string
    username: string
    name: string | null
    email: string | null
  }
  content: string
  anchor:
    | {
        type: 'image_point'
        x: number
        y: number
      }
    | {
        type: 'video_point'
        t: number
        x?: number
        y?: number
      }
    | {
        type: 'audio_point'
        t: number
      }
    | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  quotedComment?: {
    id: string
    author: {
      id: string
      username: string
      name: string | null
      email: string | null
    }
    content: string
    createdAt: string
    deletedAt: string | null
  } | null
}

export const CommentThread = ({
  folderId,
  folderObjectId,
  rootComment,
  currentUserId,
  onDelete,
}: {
  folderId: string
  folderObjectId: string
  rootComment: CommentData
  currentUserId?: string
  onDelete?: (commentId: string) => void
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showReplyForm, setShowReplyForm] = React.useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = React.useState<
    string | undefined
  >(undefined)

  const threadQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
    {
      params: {
        path: { folderId, folderObjectId, rootId: rootComment.id },
      },
    },
  )

  const createCommentMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
    {
      onSuccess: () => {
        void threadQuery.refetch()
        setShowReplyForm(false)
        setSelectedQuoteId(undefined)
      },
    },
  )

  const addReactionMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions',
    {
      onSuccess: () => {
        void threadQuery.refetch()
      },
    },
  )

  const removeReactionMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions/{emoji}',
    {
      onSuccess: () => {
        void threadQuery.refetch()
      },
    },
  )

  const handleReaction = (commentId: string, emoji: string) => {
    const comment = threadQuery.data?.comments.find(
      (c: CommentData) => c.id === commentId,
    )
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

  const handleReply = (content: string) => {
    createCommentMutation.mutate({
      params: {
        path: {
          folderId,
          folderObjectId,
        },
      },
      body: {
        content,
        quoteId: selectedQuoteId,
        rootCommentId: rootComment.id, // Create comment in this anchored thread
      },
    })
  }

  const handleQuote = (commentId: string) => {
    // Only allow quoting root comments (not replies)
    // Find the comment in the thread to check if it's a root comment
    const comment = threadQuery.data?.comments.find(
      (c: CommentData) => c.id === commentId,
    )
    if (comment?.rootId === null) {
      setSelectedQuoteId(commentId)
      setShowReplyForm(true)
    }
  }
  const replies =
    threadQuery.data?.comments.filter(
      (c: CommentData) => c.id !== rootComment.id,
    ) ?? []
  const replyCount = replies.length
  const hasReplies = replyCount > 0

  return (
    <div className="flex flex-col gap-2">
      <CommentItem
        comment={rootComment}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onQuote={handleQuote}
        onReaction={handleReaction}
      />

      {hasReplies && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="self-start text-xs">
              {isOpen ? 'Hide' : 'Show'} {replyCount}{' '}
              {replyCount === 1 ? 'reply' : 'replies'}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="flex flex-col gap-3">
              {threadQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <>
                  {replies.map((reply: CommentData) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      onDelete={onDelete}
                      onQuote={handleQuote}
                      onReaction={handleReaction}
                    />
                  ))}

                  {showReplyForm ? (
                    <div className="mt-2">
                      <CommentForm
                        onSubmit={handleReply}
                        onCancel={() => {
                          setShowReplyForm(false)
                          setSelectedQuoteId(undefined)
                        }}
                        placeholder={
                          selectedQuoteId
                            ? 'Write a reply...'
                            : 'Write a reply...'
                        }
                        submitLabel="Reply"
                      />
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => {
                        setShowReplyForm(true)
                      }}
                    >
                      <MessageSquare className="mr-2 size-4" />
                      Add Comment
                    </Button>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {!hasReplies && (
        <div className="flex flex-col gap-3">
          {showReplyForm ? (
            <div className="mt-2">
              <CommentForm
                onSubmit={handleReply}
                onCancel={() => {
                  setShowReplyForm(false)
                  setSelectedQuoteId(undefined)
                }}
                placeholder="Write a reply..."
                submitLabel="Reply"
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                setShowReplyForm(true)
              }}
            >
              <MessageSquare className="mr-2 size-4" />
              Add Reply
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

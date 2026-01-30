import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@lombokapp/ui-toolkit/components/popover'
import { MessageSquareQuote, Quote, SmilePlus, Trash2 } from 'lucide-react'
import React from 'react'

import { DateDisplay } from '@/src/components/date-display'

import type { CommentData } from './comment.types'

export const CommentItem = ({
  comment,
  currentUserId,
  onDelete,
  onQuote,
  onReaction,
}: {
  comment: CommentData
  currentUserId?: string
  onDelete?: (commentId: string) => void
  onQuote?: (commentId: string) => void
  onReaction?: (commentId: string, emoji: string) => void
}) => {
  const [reactionPopoverOpen, setReactionPopoverOpen] = React.useState(false)
  const isOwnComment = currentUserId === comment.author.id
  const isDeleted = !!comment.deletedAt

  return (
    <div className="flex flex-col gap-2 rounded-md border border-foreground/5 bg-foreground/[.02] p-3">
      {comment.quotedComment && (
        <div className="rounded-md border-l-2 border-primary/20 bg-foreground/[.01] py-2 pl-3 pr-2 text-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Quote className="size-3" />
            <span className="font-medium">
              {comment.quotedComment.deletedAt
                ? 'Deleted comment'
                : `@${comment.quotedComment.author.username}`}
            </span>
          </div>
          {!comment.quotedComment.deletedAt && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {comment.quotedComment.content}
            </p>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground">
              @{comment.author.username}
            </span>
            <DateDisplay
              date={comment.createdAt}
              showTimeSince={true}
              orientation="horizontal"
              showDate={true}
              className="text-xs"
            />
          </div>
          {isDeleted ? (
            <p className="mt-1 text-sm italic text-muted-foreground">
              This comment was deleted
            </p>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {comment.content}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {!isDeleted && onQuote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onQuote(comment.id)
              }}
              className="shrink-0 p-1"
            >
              <MessageSquareQuote className="size-4" />
            </Button>
          )}
          {isOwnComment && !isDeleted && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(comment.id)
              }}
              className="shrink-0 p-1"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Reactions */}
      {!isDeleted && (
        <div className="mt-2 flex flex-wrap gap-2">
          {comment.reactions?.map((reaction) => {
            const hasUserReaction = reaction.users.some(
              (u) => u.id === currentUserId,
            )
            return (
              <Button
                key={reaction.emoji}
                variant={hasUserReaction ? 'secondary' : 'outline'}
                size="sm"
                className="dark:bg-background dark:text-foreground/75 dark:hover:bg-foreground/10 h-7 gap-1 text-xs"
                onClick={() => {
                  if (onReaction) {
                    onReaction(comment.id, reaction.emoji)
                  }
                }}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </Button>
            )
          })}
          {/* Reaction button */}
          {onReaction && (
            <div className="">
              <Popover
                open={reactionPopoverOpen}
                onOpenChange={setReactionPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="dark:bg-background dark:hover:bg-foreground/10 dark:text-foreground/75 h-7 gap-1 text-xs"
                  >
                    <SmilePlus className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'].map(
                      (emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-lg"
                          onClick={() => {
                            onReaction(comment.id, emoji)
                            setReactionPopoverOpen(false)
                          }}
                        >
                          {emoji}
                        </Button>
                      ),
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

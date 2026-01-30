import type { Comment, CommentAuthor } from '../../entities/comment.entity'
import type { CommentResponseDTO } from '../comment-response.dto'

export function transformCommentToDTO(
  comment: Comment & {
    author?: CommentAuthor
    quotedComment?: Comment & { author?: CommentAuthor }
    mentions?: { id: string; username: string; name: string | null }[]
    reactions?: {
      emoji: string
      count: number
      users: {
        id: string
        username: string
        name: string | null
        email: string | null
      }[]
    }[]
  },
): CommentResponseDTO {
  return {
    id: comment.id,
    folderId: comment.folderId,
    folderObjectId: comment.folderObjectId,
    rootId: comment.rootId,
    quoteId: comment.quoteId,
    author: comment.author
      ? {
          id: comment.author.id,
          username: comment.author.username,
          name: comment.author.name ?? null,
          email: comment.author.email ?? null,
        }
      : {
          id: '', // This shouldn't happen, but TypeScript requires it
          username: '',
          name: null,
          email: null,
        },
    content: comment.content,
    anchor: comment.anchor,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    deletedAt: comment.deletedAt ?? null,
    quotedComment: comment.quotedComment
      ? {
          id: comment.quotedComment.id,
          author: comment.quotedComment.author
            ? {
                id: comment.quotedComment.author.id,
                username: comment.quotedComment.author.username,
                name: comment.quotedComment.author.name ?? null,
                email: comment.quotedComment.author.email ?? null,
              }
            : {
                id: '',
                username: '',
                name: null,
                email: null,
              },
          content: comment.quotedComment.content,
          createdAt: comment.quotedComment.createdAt,
          deletedAt: comment.quotedComment.deletedAt ?? null,
        }
      : null,
    mentions: comment.mentions,
    reactions: comment.reactions,
  }
}

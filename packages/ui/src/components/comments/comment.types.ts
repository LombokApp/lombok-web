export interface CommentAuthor {
  id: string
  username: string
  name: string | null
  email: string | null
}

export interface CommentQuotedComment {
  id: string
  author: CommentAuthor
  content: string
  createdAt: string
  deletedAt: string | null
}

export interface CommentAnchor {
  type: 'image_point'
  x: number
  y: number
}

export interface VideoCommentAnchor {
  type: 'video_point'
  t: number
  x?: number
  y?: number
}

export interface AudioCommentAnchor {
  type: 'audio_point'
  t: number
}

export type CommentAnchorType =
  | CommentAnchor
  | VideoCommentAnchor
  | AudioCommentAnchor

export interface CommentMention {
  id: string
  username: string
  name: string | null
}

export interface CommentReaction {
  emoji: string
  count: number
  users: CommentAuthor[]
}

export interface CommentData {
  id: string
  rootId: string | null
  quoteId: string | null
  author: CommentAuthor
  content: string
  anchor: CommentAnchorType | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  quotedComment?: CommentQuotedComment | null
  mentions?: CommentMention[]
  reactions?: CommentReaction[]
}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const commentAnchorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image_point'),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal('video_point'),
    t: z.number(),
    x: z.number().optional(),
    y: z.number().optional(),
  }),
  z.object({
    type: z.literal('audio_point'),
    t: z.number(),
  }),
])

const userDTOSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
})

const quotedCommentSchema = z
  .object({
    id: z.string().uuid(),
    author: userDTOSchema,
    content: z.string(),
    createdAt: z.date(),
    deletedAt: z.date().nullable(),
  })
  .nullable()

const mentionSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  name: z.string().nullable(),
})

const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  users: z.array(userDTOSchema),
})

export const commentResponseDTOSchema = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid(),
  folderObjectId: z.string().uuid(),
  rootId: z.string().uuid().nullable(),
  quoteId: z.string().uuid().nullable(),
  author: userDTOSchema,
  content: z.string(),
  anchor: commentAnchorSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  quotedComment: quotedCommentSchema.optional(),
  mentions: z.array(mentionSchema).optional(),
  reactions: z.array(reactionSchema).optional(),
})

export class CommentResponseDTO extends createZodDto(
  commentResponseDTOSchema,
) {}

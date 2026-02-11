import { createZodDto } from 'nestjs-zod'
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
  id: z.guid(),
  username: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
})

const quotedCommentSchema = z
  .object({
    id: z.guid(),
    author: userDTOSchema,
    content: z.string(),
    createdAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .nullable()

const mentionSchema = z.object({
  id: z.guid(),
  username: z.string(),
  name: z.string().nullable(),
})

const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  users: z.array(userDTOSchema),
})

export const commentResponseDTOSchema = z.object({
  id: z.guid(),
  folderId: z.guid(),
  folderObjectId: z.guid(),
  rootId: z.guid().nullable(),
  quoteId: z.guid().nullable(),
  author: userDTOSchema,
  content: z.string(),
  anchor: commentAnchorSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  quotedComment: quotedCommentSchema.optional(),
  mentions: z.array(mentionSchema).optional(),
  reactions: z.array(reactionSchema).optional(),
})

export class CommentResponseDTO extends createZodDto(
  commentResponseDTOSchema,
) {}

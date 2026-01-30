import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const commentAnchorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image_point'),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal('video_point'),
    t: z.number().min(0),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
  }),
  z.object({
    type: z.literal('audio_point'),
    t: z.number().min(0),
  }),
])

export const createCommentDTOSchema = z.object({
  content: z.string().min(1),
  anchor: commentAnchorSchema.optional(),
  quoteId: z.string().uuid().optional(),
  rootCommentId: z.string().uuid().optional(),
})

export class CreateCommentDTO extends createZodDto(createCommentDTOSchema) {}

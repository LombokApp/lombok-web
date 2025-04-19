import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userSessionListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      id: z.string().uuid(),
      expiresAt: z.date(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),
})

export class UserSessionListResponse extends createZodDto(
  userSessionListResponseSchema,
) {}

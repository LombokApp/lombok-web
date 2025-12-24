import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userSessionListResponseDTOSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      id: z.string().uuid(),
      expiresAt: z.string().datetime(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
})

export class UserSessionListResponse extends createZodDto(
  userSessionListResponseDTOSchema,
) {}

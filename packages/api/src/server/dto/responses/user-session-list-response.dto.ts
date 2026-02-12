import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userSessionListResponseDTOSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      id: z.guid(),
      expiresAt: z.iso.datetime(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
  ),
})

export class UserSessionListResponse extends createZodDto(
  userSessionListResponseDTOSchema,
) {}

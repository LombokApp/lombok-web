import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userListResponseDTOSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.union([z.string(), z.null()]),
      email: z.union([z.string(), z.null()]),
      emailVerified: z.boolean(),
      isAdmin: z.boolean(),
      username: z.string(),
      permissions: z.array(z.string()),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
})

export class UserListResponse extends createZodDto(userListResponseDTOSchema) {}

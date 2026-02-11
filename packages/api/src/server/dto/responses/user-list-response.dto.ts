import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userListResponseDTOSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      id: z.guid(),
      name: z.union([z.string(), z.null()]),
      email: z.union([z.string(), z.null()]),
      emailVerified: z.boolean(),
      isAdmin: z.boolean(),
      username: z.string(),
      permissions: z.array(z.string()),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
  ),
})

export class UserListResponse extends createZodDto(userListResponseDTOSchema) {}

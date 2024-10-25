import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { UserSort } from '../services/users.service'

export const usersListQueryParamsSchema = z.object({
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
  isAdmin: z.preprocess((a) => a === 'true', z.boolean().optional()),
  sort: z.nativeEnum(UserSort).optional(),
  search: z.string().optional(),
})

export class UsersListQueryParamsDTO extends createZodDto(
  usersListQueryParamsSchema,
) {}

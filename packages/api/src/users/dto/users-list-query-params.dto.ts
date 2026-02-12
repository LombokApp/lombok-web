import { createZodDto } from 'nestjs-zod'
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
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
  isAdmin: z.preprocess((a) => a === 'true', z.boolean().optional()).optional(),
  sort: z.array(z.enum(UserSort)).or(z.enum(UserSort).optional()).optional(),
  search: z.string().optional(),
})

export class UsersListQueryParamsDTO extends createZodDto(
  usersListQueryParamsSchema,
) {}

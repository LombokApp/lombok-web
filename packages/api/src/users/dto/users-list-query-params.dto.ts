import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { UserSort } from '../services/users.service'

export const usersListQueryParamsSchema = z.object({
  offset: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive(),
  ),
  limit: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive(),
  ),
  isAdmin: z.preprocess((a) => a === 'true', z.boolean().optional()),
  sort: z.nativeEnum(UserSort).optional(),
})

export class UsersListQueryParamsDTO extends createZodDto(
  usersListQueryParamsSchema,
) {}

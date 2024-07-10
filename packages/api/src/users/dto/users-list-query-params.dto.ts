import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { UserSort } from '../services/users.service'

export const usersListQueryParamsSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  isAdmin: z.boolean().optional(),
  sort: z.nativeEnum(UserSort).optional(),
})

export class UsersListQueryParamsDTO extends createZodDto(
  usersListQueryParamsSchema,
) {}

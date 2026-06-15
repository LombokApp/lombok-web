import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userAppStorageListQueryParamsSchema = z.object({
  // Optional sub-prefix within the user's partition (partition-relative).
  prefix: z.string().optional(),
  continuationToken: z.string().optional(),
})

export class UserAppStorageListQueryParamsDTO extends createZodDto(
  userAppStorageListQueryParamsSchema,
) {}

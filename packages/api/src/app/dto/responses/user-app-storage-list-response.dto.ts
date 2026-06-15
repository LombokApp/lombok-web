import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userAppStorageListResponseSchema = z.object({
  result: z.array(
    z.object({
      // Partition-relative key (the app+user partition prefix is stripped).
      key: z.string(),
      size: z.number(),
      eTag: z.string(),
      lastModified: z.number(),
    }),
  ),
  continuationToken: z.string().optional(),
})

export class UserAppStorageListResponseDTO extends createZodDto(
  userAppStorageListResponseSchema,
) {}

import { SignedURLsRequestMethod } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userAppStoragePresignInputSchema = z.object({
  requests: z
    .array(
      z.object({
        // Partition-relative key, as returned by the storage listing endpoint.
        objectKey: z.string().min(1),
        // Read-only: users browse/download their app data; the owning app writes it.
        method: z.enum([
          SignedURLsRequestMethod.GET,
          SignedURLsRequestMethod.HEAD,
        ]),
      }),
    )
    .min(1),
})

export class UserAppStoragePresignInputDTO extends createZodDto(
  userAppStoragePresignInputSchema,
) {}

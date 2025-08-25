import { createZodDto } from '@anatine/zod-nestjs'
import { storageProvisionSchema } from '@lombokapp/types'
import { z } from 'zod'

export const storageProvisionsListResponseSchema = z.object({
  result: z.array(storageProvisionSchema),
})

export class StorageProvisionsListResponse extends createZodDto(
  storageProvisionsListResponseSchema,
) {}

import { storageProvisionSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const storageProvisionsListResponseSchema = z.object({
  result: z.array(storageProvisionSchema),
})

export class StorageProvisionsListResponse extends createZodDto(
  storageProvisionsListResponseSchema,
) {}

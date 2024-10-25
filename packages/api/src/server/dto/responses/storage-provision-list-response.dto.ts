import { createZodDto } from '@anatine/zod-nestjs'

import { z } from 'zod'
import { storageProvisionSchema } from '../storage-provision.dto'

export const storageProvisionListResponseSchema = z.object({
  result: z.array(storageProvisionSchema),
})

export class StorageProvisionListResponse extends createZodDto(
  storageProvisionListResponseSchema,
) {}

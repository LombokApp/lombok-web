import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { StorageProvisionType } from '../constants/server.constants'

export const storageProvisionsListQueryParamsSchema = z.object({
  provisionType: z.nativeEnum(StorageProvisionType).optional(),
})

export class StorageProvisionsListQueryParamsDTO extends createZodDto(
  storageProvisionsListQueryParamsSchema,
) {}

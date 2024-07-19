import { createZodDto } from '@anatine/zod-nestjs'
import { StorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const storageProvisionsListQueryParamsSchema = z.object({
  provisionType: StorageProvisionTypeZodEnum.optional(),
})

export class StorageProvisionsListQueryParamsDTO extends createZodDto(
  storageProvisionsListQueryParamsSchema,
) {}

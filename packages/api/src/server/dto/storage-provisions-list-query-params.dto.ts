import { StorageProvisionTypeZodEnum } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const storageProvisionsListQueryParamsSchema = z.object({
  provisionType: StorageProvisionTypeZodEnum.optional(),
})

export class StorageProvisionsListQueryParamsDTO extends createZodDto(
  storageProvisionsListQueryParamsSchema,
) {}

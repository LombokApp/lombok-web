import { createZodDto } from '@anatine/zod-nestjs'
import { UserStorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const storageProvisionsListQueryParamsSchema = z.object({
  provisionType: UserStorageProvisionTypeZodEnum.optional(),
})

export class StorageProvisionsListQueryParamsDTO extends createZodDto(
  storageProvisionsListQueryParamsSchema,
) {}

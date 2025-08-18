import { createZodDto } from '@anatine/zod-nestjs'
import { storageProvisionSchema } from '@stellariscloud/types'
import { z } from 'zod'

export class StorageProvisionGetResponse extends createZodDto(
  z.object({
    storageProvision: storageProvisionSchema,
  }),
) {}

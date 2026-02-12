import { storageProvisionSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class StorageProvisionGetResponse extends createZodDto(
  z.object({
    storageProvision: storageProvisionSchema,
  }),
) {}

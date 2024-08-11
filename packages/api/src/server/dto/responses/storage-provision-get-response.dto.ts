import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { storageProvisionSchema } from '../storage-provision.dto'

export class StorageProvisionGetResponse extends createZodDto(
  z.object({
    storageProvision: storageProvisionSchema,
  }),
) {}

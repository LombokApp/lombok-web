import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { StorageProvisionType } from '../constants/server.constants'

export const storageProvisionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(z.nativeEnum(StorageProvisionType)),
  label: z.string().max(32),
  description: z.string().max(128),
})

export class StorageProvisionDTO extends createZodDto(storageProvisionSchema) {}

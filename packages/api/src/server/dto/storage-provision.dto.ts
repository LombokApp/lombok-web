import { createZodDto } from '@anatine/zod-nestjs'
import { StorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const storageProvisionSchema = z.object({
  id: z.string().uuid(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum).min(1),
  label: z.string().max(32),
  description: z.string().max(128),
})

export class StorageProvisionDTO extends createZodDto(storageProvisionSchema) {}

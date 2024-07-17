import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { StorageProvisionType } from '../constants/server.constants'

export const storageProvisionInputSchema = z.object({
  label: z.string().max(32),
  description: z.string().max(128),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(z.nativeEnum(StorageProvisionType)),
})

export class StorageProvisionInputDTO extends createZodDto(
  storageProvisionInputSchema,
) {}

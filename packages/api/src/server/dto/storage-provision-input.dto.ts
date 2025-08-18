import { createZodDto } from '@anatine/zod-nestjs'
import { StorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const storageProvisionInputSchema = z.object({
  label: z.string().max(32),
  description: z.string().max(128),
  endpoint: z.string().refine((endpoint) => {
    new URL(endpoint)
    return true
  }),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum).min(1),
})

export class StorageProvisionInputDTO extends createZodDto(
  storageProvisionInputSchema,
) {}

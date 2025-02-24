import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const storageLocationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  providerType: z.enum(['SERVER', 'USER']),
  label: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  prefix: z.string().optional(),
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
})

export class StorageLocationDTO extends createZodDto(storageLocationSchema) {}

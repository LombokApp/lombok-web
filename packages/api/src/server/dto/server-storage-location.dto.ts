import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const serverStorageLocationSchema = z.object({
  accessKeyHashId: z.string(),
  accessKeyId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  prefix: z.union([z.null(), z.string()]),
})

export class ServerStorageLocationDTO extends createZodDto(
  serverStorageLocationSchema,
) {}

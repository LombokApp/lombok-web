import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const storageLocationDTOSchema = z.object({
  id: z.guid(),
  userId: z.guid().optional(),
  providerType: z.enum(['SERVER', 'USER']),
  label: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  prefix: z.string().nonempty().nullable(),
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
})

export class StorageLocationDTO extends createZodDto(
  storageLocationDTOSchema,
) {}

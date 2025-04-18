import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const accessKeyPublicSchema = z.object({
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  endpointDomain: z.string(),
  region: z.string(),
  folderCount: z.number(),
})

export const accessKeySchema = z
  .object({
    secretAccessKey: z.string(),
  })
  .extend(accessKeyPublicSchema.shape)

export class AccessKeyPublicDTO extends createZodDto(accessKeyPublicSchema) {}

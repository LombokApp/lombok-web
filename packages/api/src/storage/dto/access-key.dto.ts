import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const accessKeySchema = z.object({
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  endpointDomain: z.string(),
  region: z.string(),
  folderCount: z.number(),
})

export class AccessKeyDTO extends createZodDto(accessKeySchema) {}

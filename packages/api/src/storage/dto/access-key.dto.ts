import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const accessKeySchema = z.object({
  accessKeyId: z.string(),
  endpointHost: z.string(),
  folderCount: z.number(),
})

export class AccessKeyDTO extends createZodDto(accessKeySchema) {}

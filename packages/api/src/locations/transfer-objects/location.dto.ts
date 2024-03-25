// export interface LocationDTO extends TimestampDTO {
//   id: string
//   userId?: string
//   providerType: 'SERVER' | 'USER'
//   name: string
//   endpoint: string
//   region?: string
//   bucket: string
//   prefix?: string
//   accessKeyId: string
// }

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const locationSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  prefix: z.string().optional(),
  accessKeyId: z.string(),
})

export class LocationDTO extends createZodDto(locationSchema) {}

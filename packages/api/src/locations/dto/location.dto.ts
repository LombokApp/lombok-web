import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const locationSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  label: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  prefix: z.string().optional(),
  accessKeyId: z.string(),
})

export class LocationDTO extends createZodDto(locationSchema) {}

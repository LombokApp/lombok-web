import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const storageLocationInputSchema = z.union([
  z.object({
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    endpoint: z.string(),
    bucket: z.string(),
    region: z.string(),
    prefix: z.string().optional(),
  }),
  z.object({
    storageProvisionId: z.string().uuid(),
  }),
  z.object({
    userLocationId: z.string().uuid(),
    userLocationBucketOverride: z.string(),
    userLocationPrefixOverride: z.string().optional(),
  }),
])

export class StorageLocationInputDTO extends createZodDto(
  storageLocationInputSchema,
) {}

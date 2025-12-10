import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const storageLocationInputDTOSchema = z.union([
  z.object({
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    endpoint: z.string(),
    bucket: z.string(),
    region: z.string(),
    prefix: z
      .string()
      .refine(
        (prefix) => prefix.at(0) !== '/' && prefix.at(-1) !== '/',
        'Prefix cannot start or end with "/".',
      )
      .optional(),
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
  storageLocationInputDTOSchema,
) {}

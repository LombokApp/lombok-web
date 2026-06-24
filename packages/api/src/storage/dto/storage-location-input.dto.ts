import { hasEncodedForwardSlash } from '@lombokapp/utils'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const storageLocationInputDTOSchema = z
  .union([
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
        .refine(
          (prefix) => !hasEncodedForwardSlash(prefix),
          'Prefix cannot contain "%2F".',
        )
        .nullable(),
    }),
    z.object({
      storageProvisionId: z.guid(),
    }),
    z.object({
      userLocationId: z.guid(),
      userLocationBucketOverride: z.string(),
      userLocationPrefixOverride: z
        .string()
        .refine(
          (prefix) => !hasEncodedForwardSlash(prefix),
          'Prefix cannot contain "%2F".',
        )
        .nullable(),
    }),
  ])
  .meta({ id: 'StorageLocationInput' })

// @ts-expect-error - Union type causes TypeScript error with class extension in Zod v4
export class StorageLocationInputDTO extends createZodDto(
  storageLocationInputDTOSchema,
) {}

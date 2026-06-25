import { hasEncodedForwardSlash } from '@lombokapp/utils'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// A storage target chosen when creating a folder. One of: the builtin (embedded)
// provision; a raw custom S3 location; an external server provision; or an
// override of one of the user's existing locations. The builtin is selected with
// `{ builtin: true }` rather than its reserved provision id.
export const storageTargetInputDTOSchema = z
  .union([
    z.object({
      builtin: z.literal(true),
    }),
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
  .meta({ id: 'StorageTargetInput' })

// @ts-expect-error - Union type causes TypeScript error with class extension in Zod v4
export class StorageTargetInputDTO extends createZodDto(
  storageTargetInputDTOSchema,
) {}

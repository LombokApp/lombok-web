import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

// TODO: Improve this with some form of "OR" type
export const storageLocationInputSchema = z.object({
  storageProvisionId: z.string().uuid().optional(),
  userLocationId: z.string().uuid().optional(),
  userLocationBucketOverride: z.string().optional(),
  userLocationPrefixOverride: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  endpoint: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  prefix: z.string().optional(),
})

// export const storageLocationInputSchema = z
//   .object({
//     storageProvisionId: z.string().uuid().optional(),
//   })
//   .or(
//     z.object({
//       accessKeyId: z.string().optional(),
//       secretAccessKey: z.string().optional(),
//       endpoint: z.string().optional(),
//       bucket: z.string().optional(),
//       region: z.string().optional(),
//       prefix: z.string().optional(),
//     }),
//   )
//   .or(
//     z.object({
//       userLocationId: z.string().uuid().optional(),
//       userLocationBucketOverride: z.string().optional(),
//       userLocationPrefixOverride: z.string().optional(),
//     }),
//   )

export class StorageLocationInputDTO extends createZodDto(
  storageLocationInputSchema,
) {}

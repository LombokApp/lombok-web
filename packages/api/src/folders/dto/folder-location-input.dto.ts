import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderLocationInputSchema = z.object({
  serverLocationId: z.string().optional(),
  userLocationId: z.string().optional(),
  userLocationBucketOverride: z.string().optional(),
  userLocationPrefixOverride: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  endpoint: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  prefix: z.string().optional(),
})

export class FolderLocationInputDTO extends createZodDto(
  folderLocationInputSchema,
) {}

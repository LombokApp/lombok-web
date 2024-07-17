import { createZodDto } from '@anatine/zod-nestjs'
import { StorageProvisionType } from 'src/server/constants/server.constants'
import { z } from 'zod'

export const storageProvisionSchema = z.object({
  id: z.string(),
  label: z.string().max(32),
  description: z.string().max(128),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(z.nativeEnum(StorageProvisionType)),
})

export const storageProvisionListResponseSchema = z.object({
  result: z.array(storageProvisionSchema),
})

export class StorageProvisionListResponse extends createZodDto(
  storageProvisionListResponseSchema,
) {}

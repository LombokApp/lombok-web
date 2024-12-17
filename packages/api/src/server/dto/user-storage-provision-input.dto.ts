import { createZodDto } from '@anatine/zod-nestjs'
import { UserStorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const userStorageProvisionInputSchema = z.object({
  label: z.string().max(32),
  description: z.string().max(128),
  endpoint: z.string().refine((endpoint) => {
    new URL(endpoint)
    return true
  }),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(UserStorageProvisionTypeZodEnum).min(1),
})

export class UserStorageProvisionInputDTO extends createZodDto(
  userStorageProvisionInputSchema,
) {}

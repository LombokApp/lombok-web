import { createZodDto } from '@anatine/zod-nestjs'
import { UserStorageProvisionTypeZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const userStorageProvisionSchema = z.object({
  id: z.string().uuid(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(UserStorageProvisionTypeZodEnum).min(1),
  label: z.string().max(32),
  description: z.string().max(128),
})

export class UserStorageProvisionDTO extends createZodDto(
  userStorageProvisionSchema,
) {}

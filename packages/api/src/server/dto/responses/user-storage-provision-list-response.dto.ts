import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { userStorageProvisionSchema } from '../user-storage-provision.dto'

export const userStorageProvisionListResponseSchema = z.object({
  result: z.array(userStorageProvisionSchema),
})

export class UserStorageProvisionListResponse extends createZodDto(
  userStorageProvisionListResponseSchema,
) {}

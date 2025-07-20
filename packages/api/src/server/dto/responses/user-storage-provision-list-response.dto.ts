import { createZodDto } from '@anatine/zod-nestjs'
import { userStorageProvisionSchema } from '@stellariscloud/types'
import { z } from 'zod'

export const userStorageProvisionListResponseSchema = z.object({
  result: z.array(userStorageProvisionSchema),
})

export class UserStorageProvisionListResponse extends createZodDto(
  userStorageProvisionListResponseSchema,
) {}

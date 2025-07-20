import { createZodDto } from '@anatine/zod-nestjs'
import { userStorageProvisionSchema } from '@stellariscloud/types'
import { z } from 'zod'

export class UserStorageProvisionGetResponse extends createZodDto(
  z.object({
    userStorageProvision: userStorageProvisionSchema,
  }),
) {}

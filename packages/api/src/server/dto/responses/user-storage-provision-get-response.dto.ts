import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { userStorageProvisionSchema } from '../user-storage-provision.dto'

export class UserStorageProvisionGetResponse extends createZodDto(
  z.object({
    userStorageProvision: userStorageProvisionSchema,
  }),
) {}

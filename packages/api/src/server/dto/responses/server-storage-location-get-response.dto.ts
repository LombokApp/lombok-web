import { createZodDto } from '@anatine/zod-nestjs'
import { serverStorageLocationSchema } from '@stellariscloud/types'
import { z } from 'zod'

export class ServerStorageLocationGetResponse extends createZodDto(
  z.object({
    serverStorageLocation: serverStorageLocationSchema.optional(),
  }),
) {}

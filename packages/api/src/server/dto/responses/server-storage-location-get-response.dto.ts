import { createZodDto } from '@anatine/zod-nestjs'
import { serverStorageSchema } from '@lombokapp/types'
import { z } from 'zod'

export class ServerStorageLocationGetResponse extends createZodDto(
  z.object({
    serverStorageLocation: serverStorageSchema.optional(),
  }),
) {}

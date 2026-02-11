import { serverStorageSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class ServerStorageLocationGetResponse extends createZodDto(
  z.object({
    serverStorageLocation: serverStorageSchema.optional(),
  }),
) {}

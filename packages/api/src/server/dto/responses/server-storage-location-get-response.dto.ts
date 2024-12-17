import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'
import { serverStorageLocationSchema } from '../server-storage-location.dto'

export class ServerStorageLocationGetResponse extends createZodDto(
  z.object({
    serverStorageLocation: serverStorageLocationSchema.optional(),
  }),
) {}

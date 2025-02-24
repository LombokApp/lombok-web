import { createZodDto } from '@anatine/zod-nestjs'
import { serverStorageLocationInputSchema } from '@stellariscloud/types'

export class ServerStorageLocationInputDTO extends createZodDto(
  serverStorageLocationInputSchema,
) {}

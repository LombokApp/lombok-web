import { createZodDto } from '@anatine/zod-nestjs'
import { appWorkerSocketConnectionSchema } from '@lombokapp/types'

export class ConnectedAppWorker extends createZodDto(
  appWorkerSocketConnectionSchema,
) {}

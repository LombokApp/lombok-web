import { createZodDto } from '@anatine/zod-nestjs'
import { appRuntimeWorkerSocketConnectionSchema } from '@lombokapp/types'

export class ConnectedAppWorker extends createZodDto(
  appRuntimeWorkerSocketConnectionSchema,
) {}

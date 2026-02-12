import { appRuntimeWorkerSocketConnectionSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

export class ConnectedAppWorker extends createZodDto(
  appRuntimeWorkerSocketConnectionSchema,
) {}

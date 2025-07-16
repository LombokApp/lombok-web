import { createZodDto } from '@anatine/zod-nestjs'
import { externalAppWorkerSchema } from '@stellariscloud/types'

export class ExternalAppWorker extends createZodDto(externalAppWorkerSchema) {}

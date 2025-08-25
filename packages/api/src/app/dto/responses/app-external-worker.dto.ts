import { createZodDto } from '@anatine/zod-nestjs'
import { externalAppWorkerSchema } from '@lombokapp/types'

export class ExternalAppWorker extends createZodDto(externalAppWorkerSchema) {}

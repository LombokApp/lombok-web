import { createZodDto } from '@anatine/zod-nestjs'
import { connectedAppWorkerSchema } from '@stellariscloud/types'

export class AppWorker extends createZodDto(connectedAppWorkerSchema) {}

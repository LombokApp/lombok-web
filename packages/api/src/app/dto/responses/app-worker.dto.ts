import { createZodDto } from '@anatine/zod-nestjs'
import { connectedAppInstanceSchema } from '@stellariscloud/types'

export class AppWorker extends createZodDto(connectedAppInstanceSchema) {}

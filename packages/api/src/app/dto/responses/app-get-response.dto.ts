import { createZodDto } from '@anatine/zod-nestjs'
import { appWorkerScriptsSchema } from '@stellariscloud/types'
import { z } from 'zod'

import { appSchema } from '../app.dto'

export const appGetResponseSchema = z.object({
  app: appSchema.omit({ workerScripts: true }).extend({
    workerScripts: appWorkerScriptsSchema,
  }),
})

export class AppGetResponse extends createZodDto(appGetResponseSchema) {}

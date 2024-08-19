import { createZodDto } from '@anatine/zod-nestjs'
import { appConfigSchema, appUIConfigMapping } from '@stellariscloud/types'
import { z } from 'zod'

export const appSchema = z.object({
  identifier: z.string(),
  config: appConfigSchema,
  ui: appUIConfigMapping,
})

export class AppDTO extends createZodDto(appSchema) {}

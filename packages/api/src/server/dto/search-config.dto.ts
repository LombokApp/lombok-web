import { appIdentifierSchema, workerIdentifierSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const searchConfigSchema = z.object({
  app: z
    .object({
      identifier: appIdentifierSchema,
      workerIdentifier: workerIdentifierSchema,
    })
    .nullable(),
})

export class SearchConfigDTO extends createZodDto(searchConfigSchema) {}

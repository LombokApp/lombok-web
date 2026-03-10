import { jsonSchema07ObjectSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const appCustomSettingsGetResponseSchema = z.object({
  settings: z.object({
    values: z.record(z.string(), z.unknown()),
    sources: z.record(z.string(), z.enum(['folder', 'user', 'default'])),
    schema: jsonSchema07ObjectSchema.nullable(),
    secretKeyPattern: z.string().nullable(),
  }),
})

export class AppCustomSettingsGetResponseDTO extends createZodDto(
  appCustomSettingsGetResponseSchema,
) {}

import { jsonSerializableObjectSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const appCustomSettingsPatchInputSchema = z.object({
  values: jsonSerializableObjectSchema,
})

export class AppCustomSettingsPatchInputDTO extends createZodDto(
  appCustomSettingsPatchInputSchema,
) {}

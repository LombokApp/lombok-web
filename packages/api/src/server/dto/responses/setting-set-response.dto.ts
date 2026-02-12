import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const settingSetResponseSchema = z.object({
  settingKey: z.string(),
  settingValue: z.any(),
})

export class SettingSetResponse extends createZodDto(
  settingSetResponseSchema,
) {}

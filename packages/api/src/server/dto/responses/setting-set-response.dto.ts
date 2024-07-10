import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const settingSetResponseSchema = z.object({
  key: z.string(),
  value: z.any(),
})

export class SettingSetResponse extends createZodDto(
  settingSetResponseSchema,
) {}

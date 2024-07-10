import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const setSettingInputSchema = z.object({
  value: z.any(),
})

export class SetSettingInputDTO extends createZodDto(setSettingInputSchema) {}

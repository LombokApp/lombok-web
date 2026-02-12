import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const setSettingInputSchema = z.object({
  value: z.any(),
})

export class SetSettingInputDTO extends createZodDto(setSettingInputSchema) {}

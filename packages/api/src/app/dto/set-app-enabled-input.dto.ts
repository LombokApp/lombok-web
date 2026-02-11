import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const setAppEnabledInputSchema = z.object({
  enabled: z.boolean(),
})

export class SetAppEnabledInputDTO extends createZodDto(
  setAppEnabledInputSchema,
) {}

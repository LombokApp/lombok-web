import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const appCustomSettingsPutInputSchema = z.object({
  values: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.null()]),
  ),
})

export class AppCustomSettingsPutInputDTO extends createZodDto(
  appCustomSettingsPutInputSchema,
) {}

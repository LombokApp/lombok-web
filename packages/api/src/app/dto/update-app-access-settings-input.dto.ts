import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const updateAppAccessSettingsInputSchema = z.object({
  userScopeEnabledDefault: z.boolean(),
  folderScopeEnabledDefault: z.boolean(),
})

export class UpdateAppAccessSettingsInputDTO extends createZodDto(
  updateAppAccessSettingsInputSchema,
) {}

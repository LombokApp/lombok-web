import { createZodDto } from '@anatine/zod-nestjs'
import {
  folderScopeAppPermissionsSchema,
  userScopeAppPermissionsSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const appUserSettingsCreateInputSchema = z.object({
  enabled: z.boolean().nullable(),
  folderScopeEnabledDefault: z.boolean().nullable(),
  folderScopePermissionsDefault: z
    .array(folderScopeAppPermissionsSchema)
    .nullable(),
  permissions: z.array(userScopeAppPermissionsSchema).nullable(),
})

export class AppUserSettingsCreateInputDTO extends createZodDto(
  appUserSettingsCreateInputSchema,
) {}

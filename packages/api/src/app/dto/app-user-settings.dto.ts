import { createZodDto } from '@anatine/zod-nestjs'
import {
  folderScopeAppPermissionsSchema,
  userScopeAppPermissionsSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const appUserSettingsSchema = z.object({
  appIdentifier: z.string(),
  enabledFallback: z.boolean(),
  folderScopeEnabledDefaultFallback: z.boolean(),
  permissionsFallback: z.array(userScopeAppPermissionsSchema),
  enabled: z.boolean().nullable(),
  folderScopeEnabledDefault: z.boolean().nullable(),
  folderScopePermissionsDefault: z
    .array(folderScopeAppPermissionsSchema)
    .nullable(),
  permissions: z.array(userScopeAppPermissionsSchema).nullable(),
})

export class AppUserSettingsDTO extends createZodDto(appUserSettingsSchema) {}

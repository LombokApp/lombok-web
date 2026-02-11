import { folderScopeAppPermissionsSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderAppSettingsSchema = z.object({
  appIdentifier: z.string(),
  enabledFallback: z.object({
    value: z.boolean(),
    source: z.enum(['system', 'user']),
  }),
  permissionsFallback: z.object({
    value: z.array(folderScopeAppPermissionsSchema),
    source: z.enum(['system', 'user']),
  }),
  enabled: z.boolean().nullable(),
  permissions: z.array(folderScopeAppPermissionsSchema).nullable(),
})

export class FolderUserSettingsDTO extends createZodDto(
  folderAppSettingsSchema,
) {}

import { folderScopeAppPermissionsSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const appFolderSettingsUpdateSchema = z.union([
  z.object({
    enabled: z.boolean().nullable(),
    permissions: z.array(folderScopeAppPermissionsSchema),
  }),
  z.object({
    enabled: z.boolean(),
    permissions: z.array(folderScopeAppPermissionsSchema),
  }),
  z.object({
    enabled: z.boolean(),
    permissions: z.array(folderScopeAppPermissionsSchema).nullable(),
  }),
  z.object({
    permissions: z.array(folderScopeAppPermissionsSchema).nullable(),
  }),
  z.object({
    enabled: z.boolean().nullable(),
  }),
  z.null(),
])

export const appFolderSettingsUpdateInputSchema = z.record(
  z.string(),
  appFolderSettingsUpdateSchema,
)

export class AppFolderSettingsUpdateInputDTO extends createZodDto(
  appFolderSettingsUpdateInputSchema,
) {}

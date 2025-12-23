import { createZodDto } from '@anatine/zod-nestjs'
import { folderScopeAppPermissionsSchema } from '@lombokapp/types'
import { z } from 'zod'

const appFolderSettingsUpdateSchema = z
  .object({
    enabled: z.boolean().nullable(),
    permissions: z.array(folderScopeAppPermissionsSchema),
  })
  .or(
    z.object({
      enabled: z.boolean(),
      permissions: z.array(folderScopeAppPermissionsSchema).nullable(),
    }),
  )
  .or(
    z.object({
      enabled: z.boolean(),
      permissions: z.array(folderScopeAppPermissionsSchema),
    }),
  )
  .or(
    z.object({
      permissions: z.array(folderScopeAppPermissionsSchema).nullable(),
    }),
  )
  .or(
    z.object({
      enabled: z.boolean().nullable(),
    }),
  )

export const appFolderSettingsUpdateInputSchema = z.record(
  z.string(),
  appFolderSettingsUpdateSchema.nullable(),
)

export class AppFolderSettingsUpdateInputDTO extends createZodDto(
  appFolderSettingsUpdateInputSchema,
) {}

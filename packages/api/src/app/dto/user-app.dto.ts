import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appUiBundleSchema,
  appWorkersBundleSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const userAppDTOSchema = z.object({
  identifier: z.string(),
  label: z.string(),
  config: appConfigSchema,
  enabled: z.boolean(),
  userScopeEnabledDefault: z.boolean(),
  folderScopeEnabledDefault: z.boolean(),
  manifest: appManifestSchema,
  workers: appWorkersBundleSchema,
  ui: appUiBundleSchema.nullable(),
  contributions: appContributionsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export class UserAppDTO extends createZodDto(userAppDTOSchema) {}

import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appUiBundleSchema,
  appWorkersBundleSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const userAppSchema = z.object({
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
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class UserAppDTO extends createZodDto(userAppSchema) {}

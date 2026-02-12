import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appRuntimeWorkersBundleSchema,
  appUiBundleSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userAppDTOSchema = z.object({
  identifier: z.string(),
  label: z.string(),
  config: appConfigSchema,
  enabled: z.boolean(),
  userScopeEnabledDefault: z.boolean(),
  folderScopeEnabledDefault: z.boolean(),
  manifest: appManifestSchema,
  runtimeWorkers: appRuntimeWorkersBundleSchema,
  ui: appUiBundleSchema.nullable(),
  contributions: appContributionsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export class UserAppDTO extends createZodDto(userAppDTOSchema) {}

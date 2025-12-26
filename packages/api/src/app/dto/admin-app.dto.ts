import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appUiBundleSchema,
  appWorkersBundleSchema,
  externalAppWorkerSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const adminAppDTOSchema = z.object({
  identifier: z.string(),
  slug: z.string(),
  installId: z.string(),
  label: z.string(),
  publicKey: z.string(),
  config: appConfigSchema,
  requiresStorage: z.boolean(),
  enabled: z.boolean(),
  userScopeEnabledDefault: z.boolean(),
  folderScopeEnabledDefault: z.boolean(),
  manifest: appManifestSchema,
  externalWorkers: z.array(externalAppWorkerSchema),
  workers: appWorkersBundleSchema,
  ui: appUiBundleSchema.nullable(),
  contributions: appContributionsSchema,
  metrics: appMetricsSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export class AdminAppDTO extends createZodDto(adminAppDTOSchema) {}

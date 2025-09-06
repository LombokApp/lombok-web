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

export const appSchema = z.object({
  identifier: z.string(),
  label: z.string(),
  publicKey: z.string(),
  config: appConfigSchema,
  requiresStorage: z.boolean(),
  enabled: z.boolean(),
  manifest: appManifestSchema,
  externalWorkers: z.array(externalAppWorkerSchema),
  workers: appWorkersBundleSchema,
  ui: appUiBundleSchema.nullable(),
  contributions: appContributionsSchema,
  metrics: appMetricsSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class AppDTO extends createZodDto(appSchema) {}

import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appUiArraySchema,
  appWorkersSchema,
  externalAppWorkerSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const appSchema = z.object({
  identifier: z.string(),
  label: z.string(),
  publicKey: z.string(),
  config: appConfigSchema,
  requiresStorage: z.boolean(),
  enabled: z.boolean().optional(),
  manifest: appManifestSchema,
  externalWorkers: z.array(externalAppWorkerSchema),
  workers: appWorkersSchema,
  ui: appUiArraySchema,
  contributions: appContributionsSchema,
  metrics: appMetricsSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class AppDTO extends createZodDto(appSchema) {}

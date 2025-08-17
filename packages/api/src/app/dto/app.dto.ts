import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appManifestSchema,
  appUIsSchema,
  appWorkerScriptsSchema,
  externalAppWorkerSchema,
} from '@stellariscloud/types'
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
  workerScripts: appWorkerScriptsSchema,
  ui: appUIsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class AppDTO extends createZodDto(appSchema) {}

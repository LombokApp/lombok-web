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
  publicKey: z.string(),
  config: appConfigSchema,
  manifest: appManifestSchema,
  externalWorkers: z.array(externalAppWorkerSchema),
  workerScripts: appWorkerScriptsSchema,
  uis: appUIsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class AppDTO extends createZodDto(appSchema) {}

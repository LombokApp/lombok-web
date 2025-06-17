import { createZodDto } from '@anatine/zod-nestjs'
import {
  appConfigSchema,
  appManifestSchema,
  connectedAppInstanceSchema,
} from '@stellariscloud/types'
import { z } from 'zod'

export const appSchema = z.object({
  identifier: z.string(),
  publicKey: z.string(),
  config: appConfigSchema,
  manifest: appManifestSchema,
  connectedWorkers: z.array(connectedAppInstanceSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class AppDTO extends createZodDto(appSchema) {}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { appSchema } from '../app.dto'

const appWorkerSchema = z.object({
  appIdentifier: z.string(),
  socketClientId: z.string(),
  name: z.string(),
  ip: z.string(),
})

export const appListResponseSchema = z.object({
  installed: z.object({
    meta: z.object({
      totalCount: z.number(),
    }),
    result: z.array(appSchema),
  }),
  connected: z.record(z.string(), z.array(appWorkerSchema)),
})

export class AppListResponse extends createZodDto(appListResponseSchema) {}

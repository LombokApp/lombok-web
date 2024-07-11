import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const appConfigSchema = z.object({
  publicKey: z.string(),
  description: z.string(),
  subscribedEvents: z.array(z.string()),
  emitEvents: z.array(z.string()),
  actions: z.object({
    folder: z.array(
      z.object({
        key: z.string(),
        description: z.string(),
      }),
    ),
    object: z.array(
      z.object({
        key: z.string(),
        description: z.string(),
      }),
    ),
  }),
  menuItems: z.array(
    z.object({
      label: z.string(),
      iconPath: z.string().optional(),
      uiName: z.string(),
    }),
  ),
})

export const appSchema = z.object({
  identifier: z.string(),
  config: appConfigSchema,
  ui: z.record(
    z.string(),
    z.object({
      path: z.string(),
      name: z.string(),
      files: z.array(
        z.record(
          z.string(),
          z.object({
            size: z.number(),
            hash: z.string(),
          }),
        ),
      ),
    }),
  ),
})

export class AppDTO extends createZodDto(appSchema) {}

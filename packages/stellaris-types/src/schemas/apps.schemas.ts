import { z } from 'zod'

export enum ConfigParamType {
  boolean = 'boolean',
  string = 'string',
  number = 'number',
}

export const paramConfigSchema = z.object({
  type: z.nativeEnum(ConfigParamType),
  default: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
})

export const eventTriggerSchema = z.object({
  type: z.literal('event'),
  event: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const objectActionTriggerSchema = z.object({
  type: z.literal('objectAction'),
  description: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const folderActionTriggerSchema = z.object({
  type: z.literal('folderAction'),
  actionLabel: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const triggerSchema = z.discriminatedUnion('type', [
  eventTriggerSchema,
  objectActionTriggerSchema,
  folderActionTriggerSchema,
])

export const taskConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  triggers: z.array(triggerSchema).optional(),
  folderAction: z.object({ description: z.string() }).optional(),
  objectAction: z.object({ description: z.string() }).optional(),
  description: z.string(),
  inputParams: z.record(z.string(), paramConfigSchema).optional(),
  worker: z.string().optional(),
})

export const appWorkersSchema = z.record(z.string(), z.object({}))

export const appMenuItemConfigSchema = z.object({
  label: z.string(),
  iconPath: z.string().optional(),
  uiName: z.string(),
})

export const appIdentitySchema = z.object({
  publicKey: z.string(),
  identifier: z.string(),
})

export const appManifestSchema = z.array(
  z.object({
    path: z.string(),
    hash: z.string(),
    size: z.number(),
  }),
)

export const appConfigSchema = z.object({
  description: z.string(),
  requiresStorage: z.boolean(),
  emittableEvents: z.array(z.string()),
  tasks: z.array(taskConfigSchema),
  workers: appWorkersSchema.optional(),
  menuItems: z.array(appMenuItemConfigSchema),
})

export const appUIConfigMapping = z.record(
  z.string(),
  z.object({
    path: z.string(),
    name: z.string(),
    files: z.record(
      z.string(),
      z.object({
        size: z.number(),
        hash: z.string(),
      }),
    ),
  }),
)

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

export const taskTriggerSchema = z.object({
  taskTriggerKey: z.string(),
  params: z.record(z.string(), paramConfigSchema),
})

export const taskConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  eventTriggers: z.array(z.string()),
  folderAction: z.object({ description: z.string() }).optional(),
  objectAction: z.object({ description: z.string() }).optional(),
  description: z.string(),
  inputParams: z.record(z.string(), paramConfigSchema),
})

export const appMenuItemConfigSchema = z.object({
  label: z.string(),
  iconPath: z.string().optional(),
  uiName: z.string(),
})

export const appConfigSchema = z.object({
  publicKey: z.string(),
  description: z.string(),
  emittableEvents: z.array(z.string()),
  tasks: z.array(taskConfigSchema),
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

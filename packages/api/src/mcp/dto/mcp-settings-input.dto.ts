import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const mcpPermissionsSchema = z.object({
  canRead: z.boolean().nullable().optional(),
  canWrite: z.boolean().nullable().optional(),
  canDelete: z.boolean().nullable().optional(),
  canMove: z.boolean().nullable().optional(),
})

export class McpUserSettingsInputDTO extends createZodDto(
  mcpPermissionsSchema,
) {}

export class McpFolderSettingsInputDTO extends createZodDto(
  mcpPermissionsSchema,
) {}

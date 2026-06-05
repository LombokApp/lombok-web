import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const bridgeLogsQueryParamsSchema = z.object({
  tail: z.coerce.number().int().min(1).max(2000).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'unknown']).optional(),
})

export class BridgeLogsQueryParamsDTO extends createZodDto(
  bridgeLogsQueryParamsSchema,
) {}

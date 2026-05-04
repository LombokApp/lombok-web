import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { tunnelLabelSchema } from './create-bridge-tunnel-session-request.dto'

export const createAdminBridgeTunnelSessionRequestSchema = z.object({
  hostId: z.string().min(1),
  containerId: z.string().min(1),
  command: z.array(z.string()).min(1).optional(),
  label: tunnelLabelSchema.default('admin-console'),
})

export class CreateAdminBridgeTunnelSessionRequestDTO extends createZodDto(
  createAdminBridgeTunnelSessionRequestSchema,
) {}

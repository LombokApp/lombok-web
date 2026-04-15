import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createAdminBridgeTunnelSessionRequestSchema = z.object({
  hostId: z.string().min(1),
  containerId: z.string().min(1),
  command: z.array(z.string()).min(1).optional(),
  label: z.string().min(1).max(63).default('admin-console'),
})

export class CreateAdminBridgeTunnelSessionRequestDTO extends createZodDto(
  createAdminBridgeTunnelSessionRequestSchema,
) {}

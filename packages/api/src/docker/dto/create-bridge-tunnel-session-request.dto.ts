import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createBridgeTunnelSessionRequestSchema = z.object({
  hostId: z.string().min(1),
  containerId: z.string().min(1),
  command: z.array(z.string()).min(1),
  label: z.string().min(1).max(63),
  mode: z.enum(['ephemeral', 'persistent']).default('persistent'),
  protocol: z.enum(['framed', 'raw']).default('framed'),
  public: z.boolean().default(false),
})

export class CreateBridgeTunnelSessionRequestDTO extends createZodDto(
  createBridgeTunnelSessionRequestSchema,
) {}

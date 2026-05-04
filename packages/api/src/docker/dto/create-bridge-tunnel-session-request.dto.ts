import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// DNS-label-safe charset, no '--' (which is the tunnel hostname separator).
// Min 2 chars to satisfy the leading/trailing alphanumeric anchors.
const tunnelLabelSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/,
    'label must be 2-32 lowercase alphanumeric/hyphen characters and start/end with alphanumeric',
  )
  .refine((s) => !s.includes('--'), 'label may not contain "--"')

export const createBridgeTunnelSessionRequestSchema = z.object({
  hostId: z.string().min(1),
  containerId: z.string().min(1),
  command: z.array(z.string()).min(1),
  label: tunnelLabelSchema,
  mode: z.enum(['ephemeral', 'persistent']).default('persistent'),
  protocol: z.enum(['framed', 'raw']).default('framed'),
  public: z.boolean().default(false),
})

export { tunnelLabelSchema }

export class CreateBridgeTunnelSessionRequestDTO extends createZodDto(
  createBridgeTunnelSessionRequestSchema,
) {}

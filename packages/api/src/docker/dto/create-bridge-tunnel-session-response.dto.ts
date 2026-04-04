import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createBridgeTunnelSessionResponseSchema = z.object({
  publicId: z.string().optional(),
  sessionId: z.string(),
  token: z.string(),
  urls: z.object({
    ws: z.string(),
    http: z.string(),
  }),
  public: z
    .object({
      id: z.string(),
      url: z.string(),
    })
    .optional(),
})

export class CreateBridgeTunnelSessionResponseDTO extends createZodDto(
  createBridgeTunnelSessionResponseSchema,
) {}

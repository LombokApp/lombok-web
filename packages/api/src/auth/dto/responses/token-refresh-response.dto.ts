import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const tokenRefreshResponseSchema = z.object({
  session: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.iso.datetime(),
  }),
})

export class TokenRefreshResponse extends createZodDto(
  tokenRefreshResponseSchema,
) {}

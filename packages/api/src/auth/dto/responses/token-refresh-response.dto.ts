import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const tokenRefreshResponseSchema = z.object({
  session: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.date(),
  }),
})

export class TokenRefreshResponse extends createZodDto(
  tokenRefreshResponseSchema,
) {}

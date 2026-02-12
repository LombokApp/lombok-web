import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const loginResponseSchema = z.object({
  session: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.iso.datetime(),
  }),
})

export class LoginResponse extends createZodDto(loginResponseSchema) {}

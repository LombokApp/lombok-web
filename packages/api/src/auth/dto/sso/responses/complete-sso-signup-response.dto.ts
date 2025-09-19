import { createZodDto } from '@anatine/zod-nestjs'
import { userSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const completeSSOSignupResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
})

export class CompleteSSOSignupResponse extends createZodDto(
  completeSSOSignupResponseSchema,
) {}

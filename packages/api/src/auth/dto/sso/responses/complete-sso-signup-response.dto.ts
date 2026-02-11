import { createZodDto } from 'nestjs-zod'
import { userDTOSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const completeSSOSignupResponseSchema = z.object({
  user: userDTOSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.iso.datetime(),
})

export class CompleteSSOSignupResponse extends createZodDto(
  completeSSOSignupResponseSchema,
) {}

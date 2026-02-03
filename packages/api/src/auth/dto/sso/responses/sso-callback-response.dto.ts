import { createZodDto } from '@anatine/zod-nestjs'
import { userDTOSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

// Provider user info from SSO
const providerUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
})

// Response when existing user logs in
const ssoLoginResponseSchema = z.object({
  user: userDTOSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
})

// Response when new user needs to select username
const ssoUsernameSelectionResponseSchema = z.object({
  needsUsername: z.literal(true),
  provider: z.string(),
  providerUserInfo: providerUserInfoSchema,
  suggestedUsername: z.string(),
  signature: z.string(),
  expiry: z.date(),
})

// Union type for the callback response
export const ssoCallbackResponseSchema = z.union([
  ssoLoginResponseSchema,
  ssoUsernameSelectionResponseSchema,
])

export class SSOCallbackResponse extends createZodDto(
  ssoCallbackResponseSchema,
) {}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const googleSsoProviderDataSchema = z.object({
  provider: z.literal('google'),
  providerUserInfo: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    picture: z.string().optional(),
  }),
  expiry: z.coerce.date(),
}) // add more providers here with union types

export const completeSSOSignupSchema = z.object({
  username: z.string().min(3).max(64),
  providerData: googleSsoProviderDataSchema,
  signature: z.string(),
})

export class CompleteSSOSignupDTO extends createZodDto(
  completeSSOSignupSchema,
) {}

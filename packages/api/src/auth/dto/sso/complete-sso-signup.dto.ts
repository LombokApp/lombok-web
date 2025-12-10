import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

const googleSsoProviderDataDTOSchema = z.object({
  provider: z.literal('google'),
  providerUserInfo: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    picture: z.string().optional(),
  }),
  expiry: z.coerce.date(),
}) // add more providers here with union types

export const completeSSOSignupDTOSchema = z.object({
  username: z.string().min(3).max(64),
  providerData: googleSsoProviderDataDTOSchema,
  signature: z.string(),
})

export class CompleteSSOSignupDTO extends createZodDto(
  completeSSOSignupDTOSchema,
) {}

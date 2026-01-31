import { z } from 'zod'

export const resendConfigSchema = z.object({
  apiKey: z.string().min(1),
})

export const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
})

const emailProviderConfigSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('resend'),
    config: resendConfigSchema,
    from: z.string().min(1),
  }),
  z.object({
    provider: z.literal('smtp'),
    config: smtpConfigSchema,
    from: z.string().min(1),
  }),
])

export const emailProviderConfigNullableSchema =
  emailProviderConfigSchema.nullable()

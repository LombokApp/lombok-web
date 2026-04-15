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

export const smtpConfigObfuscatedSchema = smtpConfigSchema.extend({
  password: z.null(),
})

export const resendConfigObfuscatedSchema = resendConfigSchema.extend({
  apiKey: z.null(),
})

export const resendEmailProviderSchema = z.object({
  provider: z.literal('resend'),
  config: resendConfigSchema,
  from: z.string().min(1),
})

export const smtpEmailProviderSchema = z.object({
  provider: z.literal('smtp'),
  config: smtpConfigSchema,
  from: z.string().min(1),
})

export const resendEmailProviderObfuscatedSchema =
  resendEmailProviderSchema.extend({
    config: resendConfigObfuscatedSchema,
  })

export const smtpEmailProviderObfuscatedSchema = smtpEmailProviderSchema.extend(
  {
    config: smtpConfigObfuscatedSchema,
  },
)

export const emailProviderSchema = z.discriminatedUnion('provider', [
  resendEmailProviderSchema,
  smtpEmailProviderSchema,
])

export const emailProviderObfuscatedSchema = z.discriminatedUnion('provider', [
  resendEmailProviderObfuscatedSchema,
  smtpEmailProviderObfuscatedSchema,
])

import { registerAs } from '@nestjs/config'
import { z } from 'zod'

const authEmailVerificationEnvSchema = z
  .object({
    AUTH_JWT_SECRET: z.string(),
    AUTH_EMAIL_JWT_ALGORITHM: z.enum(['RS', 'HS']).default('HS'),
    AUTH_EMAIL_VERIFICATION_JWT_PUBLIC_KEY: z.string().optional(),
    AUTH_EMAIL_VERIFICATION_JWT_PRIVATE_KEY: z.string().optional(),
    AUTH_EMAIL_VERIFICATION_JWT_SECRET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.AUTH_EMAIL_JWT_ALGORITHM === 'RS') {
      if (!data.AUTH_EMAIL_VERIFICATION_JWT_PUBLIC_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'AUTH_EMAIL_VERIFICATION_JWT_PUBLIC_KEY is required when AUTH_EMAIL_JWT_ALGORITHM is RS',
        })
      }
      if (!data.AUTH_EMAIL_VERIFICATION_JWT_PRIVATE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'AUTH_EMAIL_VERIFICATION_JWT_PRIVATE_KEY is required when AUTH_EMAIL_JWT_ALGORITHM is RS',
        })
      }
    } else if (!data.AUTH_EMAIL_VERIFICATION_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AUTH_EMAIL_VERIFICATION_JWT_SECRET is required when AUTH_EMAIL_JWT_ALGORITHM is HS',
      })
    }
  })

export const authConfig = registerAs('auth', () => {
  const result = authEmailVerificationEnvSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error(`Auth config error: ${result.error.message}`)
  }
  const env = result.data
  return {
    authJwtSecret: env.AUTH_JWT_SECRET,
    emailVerificationAlgorithm: env.AUTH_EMAIL_JWT_ALGORITHM,
    emailVerificationPrivateKey:
      env.AUTH_EMAIL_VERIFICATION_JWT_PRIVATE_KEY ?? undefined,
    emailVerificationPublicKey:
      env.AUTH_EMAIL_VERIFICATION_JWT_PUBLIC_KEY ?? undefined,
    emailVerificationSecret:
      env.AUTH_EMAIL_VERIFICATION_JWT_SECRET ?? undefined,
  }
})

import { z } from 'zod'

import { jsonSerializableObjectSchema } from './json.types'

export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'
export const APP_USER_WORKER_JWT_SUB_PREFIX = 'app_user_worker:'

export const APP_JWT_ISSUER = 'lombok'

export const appTokenActorSchema = z.enum([
  'app',
  'app_user',
  'app_user_worker',
])
export type AppTokenActor = z.infer<typeof appTokenActorSchema>

export const APP_TOKEN_EXTRA_MAX_BYTES = 1024

const baseClaims = z.object({
  iss: z.literal(APP_JWT_ISSUER),
  aud: z.string(),
  sub: z.string(),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
  appIdentifier: z.string(),
})

export const appActorClaimsSchema = baseClaims.extend({
  actor: z.literal('app'),
})

export const appUserActorClaimsSchema = baseClaims.extend({
  actor: z.literal('app_user'),
  userId: z.string(),
  sessionId: z.string(),
  extra: jsonSerializableObjectSchema.optional(),
})

export const appUserWorkerActorClaimsSchema = baseClaims.extend({
  actor: z.literal('app_user_worker'),
  userId: z.string(),
  sessionId: z.string(),
  platformAccess: z.boolean(),
  extra: jsonSerializableObjectSchema.optional(),
})

export const appJwtClaimsSchema = z.discriminatedUnion('actor', [
  appActorClaimsSchema,
  appUserActorClaimsSchema,
  appUserWorkerActorClaimsSchema,
])

export type AppActorClaims = z.infer<typeof appActorClaimsSchema>
export type AppUserActorClaims = z.infer<typeof appUserActorClaimsSchema>
export type AppUserWorkerActorClaims = z.infer<
  typeof appUserWorkerActorClaimsSchema
>
export type AppJwtClaims = z.infer<typeof appJwtClaimsSchema>

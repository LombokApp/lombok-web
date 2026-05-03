import { z } from 'zod'

import { jsonSerializableObjectSchema } from './json.types'

export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'

export const APP_JWT_ISSUER = 'lombok'

export const appTokenActorTypeSchema = z.enum(['app', 'app_user'])
export type AppTokenActorType = z.infer<typeof appTokenActorTypeSchema>

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
  actorType: z.literal('app'),
})

/**
 * Claims for tokens that act on behalf of a user.
 *
 * - `worker` absent: token represents the user driving the app's UI.
 * - `worker` present: token represents a process acting on behalf of the
 *   user (e.g. a docker worker spawned by the app). Apps' own runtime
 *   workers can use the `worker` value to gate worker-only endpoints. The
 *   string is opaque and app-defined.
 *
 * `platformAccess` controls whether the token can hit Lombok platform
 * endpoints that accept app-user tokens. It is always present and is set
 * at mint time (defaulting to `true` when `worker` is absent and `false`
 * when `worker` is present).
 */
export const appUserActorClaimsSchema = baseClaims.extend({
  actorType: z.literal('app_user'),
  userId: z.string(),
  sessionId: z.string(),
  worker: z.string().optional(),
  platformAccess: z.boolean(),
  extra: jsonSerializableObjectSchema.optional(),
})

export const appJwtClaimsSchema = z.discriminatedUnion('actorType', [
  appActorClaimsSchema,
  appUserActorClaimsSchema,
])

export type AppActorClaims = z.infer<typeof appActorClaimsSchema>
export type AppUserActorClaims = z.infer<typeof appUserActorClaimsSchema>
export type AppJwtClaims = z.infer<typeof appJwtClaimsSchema>

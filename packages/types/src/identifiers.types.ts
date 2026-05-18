import z from 'zod'

export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const taskIdentifierSchema = genericIdentifierSchema

export const appSlugSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9]+$/)
  .refine((v) => v.toLowerCase() === v, {
    message: 'App slug must be lowercase',
  })
  .refine((v) => v !== 'platform' && v !== 'core', {
    message: "App slug cannot be 'platform' or 'core'",
  })

/**
 * Composed app identifier: `<slug>-<id>` where slug is `[a-z0-9]+` (cosmetic,
 * may be renamed) and id is `[a-f0-9]{8}` (canonical, immutable).
 */
export const appIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9]+-[a-f0-9]{8}$/)

export const workerIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)
  .refine((v) => v.toLowerCase() === v)

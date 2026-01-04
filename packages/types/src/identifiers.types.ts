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

export const appIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)

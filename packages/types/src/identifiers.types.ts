import z from 'zod'

export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const taskIdentifierSchema = genericIdentifierSchema

export const slugSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9]+$/)
  .refine((v) => v.toLowerCase() === v, {
    message: 'App slug must be lowercase',
  })
  .refine((v) => v !== 'platform', {
    message: "App slug cannot be 'platform'",
  })

export const appIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-zA-Z0-9_]+$/)
  .refine((v) => v.toLowerCase() === v, {
    message: 'App identifier must be lowercase',
  })
  .refine((v) => v !== 'platform', {
    message: "App identifier cannot be 'platform'",
  })

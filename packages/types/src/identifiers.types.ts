import z from 'zod'

export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const taskIdentifierSchema = genericIdentifierSchema

export const appIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z]+$/)
  .refine((v) => v.toLowerCase() === v, {
    message: 'App identifier must be lowercase',
  })
  .refine((v) => v !== 'platform', {
    message: "App identifier cannot be 'platform'",
  })

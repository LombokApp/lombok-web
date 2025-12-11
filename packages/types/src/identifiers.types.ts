import z from 'zod'

export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

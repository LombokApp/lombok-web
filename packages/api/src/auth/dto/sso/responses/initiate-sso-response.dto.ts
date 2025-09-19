import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const initiateSSOResponseSchema = z.object({
  authUrl: z.string().url(),
})

export class InitiateSSOResponse extends createZodDto(
  initiateSSOResponseSchema,
) {}

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const initiateSSOResponseSchema = z.object({
  authUrl: z.url(),
})

export class InitiateSSOResponse extends createZodDto(
  initiateSSOResponseSchema,
) {}

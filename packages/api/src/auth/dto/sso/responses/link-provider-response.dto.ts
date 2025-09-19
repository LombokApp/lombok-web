import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const linkProviderResponseSchema = z.object({
  success: z.boolean(),
})

export class LinkProviderResponse extends createZodDto(
  linkProviderResponseSchema,
) {}

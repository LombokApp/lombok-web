import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const linkSSOProviderSchema = z.object({
  provider: z.string(),
  code: z.string(),
})

export class LinkSSOProviderDTO extends createZodDto(linkSSOProviderSchema) {}

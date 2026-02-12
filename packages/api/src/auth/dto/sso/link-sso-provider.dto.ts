import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const linkSSOProviderSchema = z.object({
  provider: z.string(),
  code: z.string(),
})

export class LinkSSOProviderDTO extends createZodDto(linkSSOProviderSchema) {}

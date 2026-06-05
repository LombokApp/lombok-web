import { createZodDto } from 'nestjs-zod'
import { imageUrlsDTOSchema } from 'src/shared/dto/image-urls.dto'
import { z } from 'zod'

export const publicSettingsSchema = z.object({
  SIGNUP_ENABLED: z.boolean().optional(),
  GOOGLE_OAUTH_ENABLED: z.boolean().optional(),
  serverIcon: imageUrlsDTOSchema.optional(),
})

export class PublicSettingsDTO extends createZodDto(publicSettingsSchema) {}

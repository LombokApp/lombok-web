import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const publicBuildIdGetResponseSchema = z.object({
  buildId: z.string(),
})

export class PublicBuildIdGetResponse extends createZodDto(
  publicBuildIdGetResponseSchema,
) {}

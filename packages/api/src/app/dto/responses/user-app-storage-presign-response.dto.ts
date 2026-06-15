import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userAppStoragePresignResponseSchema = z.object({
  urls: z.array(z.string()),
})

export class UserAppStoragePresignResponseDTO extends createZodDto(
  userAppStoragePresignResponseSchema,
) {}

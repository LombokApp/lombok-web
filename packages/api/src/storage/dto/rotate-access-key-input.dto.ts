import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const rotateAccessKeyInputSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
})

export class RotateAccessKeyInputDTO extends createZodDto(
  rotateAccessKeyInputSchema,
) {}

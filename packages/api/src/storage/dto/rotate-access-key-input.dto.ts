import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const rotateAccessKeyInputSchema = z.object({
  accessKeyId: z.string(),
  newAccessKeyId: z.string(),
  newSecretAccessKey: z.string(),
})

export class RotateAccessKeyInputDTO extends createZodDto(
  rotateAccessKeyInputSchema,
) {}

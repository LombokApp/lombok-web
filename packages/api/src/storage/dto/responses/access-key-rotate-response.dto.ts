import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const accessKeyRotateResponseSchema = z.object({
  accessKeyHashId: z.string(),
})

export class AccessKeyRotateResponse extends createZodDto(
  accessKeyRotateResponseSchema,
) {}

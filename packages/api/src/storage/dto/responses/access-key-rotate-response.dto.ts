import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const accessKeyRotateResponseSchema = z.object({
  accessKeyHashId: z.string(),
})

export class AccessKeyRotateResponse extends createZodDto(
  accessKeyRotateResponseSchema,
) {}

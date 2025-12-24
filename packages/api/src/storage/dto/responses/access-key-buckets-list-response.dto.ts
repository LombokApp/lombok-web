import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const accessKeyBucketsListResponseSchema = z.object({
  result: z.array(
    z.object({
      name: z.string(),
      createdDate: z.string().datetime().optional(),
    }),
  ),
})

export class AccessKeyBucketsListResponseDTO extends createZodDto(
  accessKeyBucketsListResponseSchema,
) {}

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const accessKeyBucketsListResponseSchema = z.object({
  result: z.array(
    z.object({
      name: z.string(),
      createdDate: z.iso.datetime().optional(),
    }),
  ),
})

export class AccessKeyBucketsListResponseDTO extends createZodDto(
  accessKeyBucketsListResponseSchema,
) {}

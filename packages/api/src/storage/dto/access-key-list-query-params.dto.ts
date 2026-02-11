import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { AccessKeySort } from '../storage-location.service'

export const accessKeyListQueryParamsSchema = z.object({
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
  sort: z
    .array(z.enum(AccessKeySort))
    .or(z.enum(AccessKeySort).optional())
    .optional(),
})

export class AccessKeyListQueryParamsDTO extends createZodDto(
  accessKeyListQueryParamsSchema,
) {}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { EventSort } from '../services/event.service'

export const eventsListQueryParamsSchema = z.object({
  sort: z
    .array(z.nativeEnum(EventSort))
    .or(z.nativeEnum(EventSort).optional())
    .optional(),
  objectKey: z.string().optional(),
  search: z.string().optional(),
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
})

export class FolderEventsListQueryParamsDTO extends createZodDto(
  eventsListQueryParamsSchema,
) {}

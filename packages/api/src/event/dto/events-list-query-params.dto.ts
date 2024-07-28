import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const eventsListQueryParamsSchema = z.object({
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
})

export class EventsListQueryParamsDTO extends createZodDto(
  eventsListQueryParamsSchema,
) {}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'
import { EventSort } from '../services/event.service'

export const eventsListQueryParamsSchema = z.object({
  sort: z.nativeEnum(EventSort).optional(),
  folderId: z.string().uuid().optional(),
  objectKey: z.string().optional(),
  search: z.string().optional(),
  includeTrace: z.literal('true').optional(),
  includeDebug: z.literal('true').optional(),
  includeInfo: z.literal('true').optional(),
  includeWarning: z.literal('true').optional(),
  includeError: z.literal('true').optional(),
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

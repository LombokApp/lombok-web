import { MediaType } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { SearchSort } from '../services/search.service'

export const searchQueryParamsSchema = z.object({
  q: z.string().min(1),
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
    .array(z.enum(SearchSort))
    .or(z.enum(SearchSort).optional())
    .optional(),
  mediaType: z
    .array(z.enum(MediaType))
    .or(z.enum(MediaType).optional())
    .optional(),
})

export class SearchQueryParamsDTO extends createZodDto(
  searchQueryParamsSchema,
) {}

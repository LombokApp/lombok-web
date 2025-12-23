import { createZodDto } from '@anatine/zod-nestjs'
import { MediaType } from '@lombokapp/types'
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
    .array(z.nativeEnum(SearchSort))
    .or(z.nativeEnum(SearchSort).optional())
    .optional(),
  mediaType: z
    .array(z.nativeEnum(MediaType))
    .or(z.nativeEnum(MediaType).optional())
    .optional(),
})

export class SearchQueryParamsDTO extends createZodDto(
  searchQueryParamsSchema,
) {}

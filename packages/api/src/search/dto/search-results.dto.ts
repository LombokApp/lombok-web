import { searchResultsSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class SearchResultsDTO extends createZodDto(
  z.object({
    result: searchResultsSchema,
    meta: z.object({
      totalCount: z.number(),
    }),
  }),
) {}

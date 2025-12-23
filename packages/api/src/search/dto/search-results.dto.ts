import { createZodDto } from '@anatine/zod-nestjs'
import { searchResultsSchema } from '@lombokapp/types'
import { z } from 'zod'

export class SearchResultsDTO extends createZodDto(
  z.object({
    result: searchResultsSchema,
    meta: z.object({
      totalCount: z.number(),
    }),
  }),
) {}

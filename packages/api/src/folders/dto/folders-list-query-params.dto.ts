import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const foldersListQueryParamsSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
})

export class FoldersListQueryParamsDTO extends createZodDto(
  foldersListQueryParamsSchema,
) {}

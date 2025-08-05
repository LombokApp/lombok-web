import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { LogSort } from '../services/log-entry.service'

export const logsListQueryParamsSchema = z.object({
  sort: z
    .array(z.nativeEnum(LogSort))
    .or(z.nativeEnum(LogSort).optional())
    .optional(),
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
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
})

export class LogsListQueryParamsDTO extends createZodDto(
  logsListQueryParamsSchema,
) {}

import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export enum AppSort {
  LabelAsc = 'label-asc',
  LabelDesc = 'label-desc',
  IdentifierAsc = 'identifier-asc',
  IdentifierDesc = 'identifier-desc',
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export const appsListQueryParamsSchema = z.object({
  sort: z
    .array(z.nativeEnum(AppSort))
    .or(z.nativeEnum(AppSort).optional())
    .optional(),
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

export class AppsListQueryParamsDTO extends createZodDto(
  appsListQueryParamsSchema,
) {}

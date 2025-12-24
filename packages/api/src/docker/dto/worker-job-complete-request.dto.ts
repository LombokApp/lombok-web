import { createZodDto } from '@anatine/zod-nestjs'
import { jsonSerializableObjectDTOSchema } from '@lombokapp/types'
import { z } from 'zod'

export const outputFilesSchema = z.object({
  outputFiles: z
    .array(
      z.object({
        folderId: z.string().uuid(),
        objectKey: z.string().nonempty(),
      }),
    )
    .optional(),
})

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .merge(outputFilesSchema)

export const successResponseSchema = z
  .object({
    success: z.literal(true),
    result: jsonSerializableObjectDTOSchema,
  })
  .merge(outputFilesSchema)

const resultSchema = z.discriminatedUnion('success', [
  successResponseSchema,
  errorResponseSchema,
])

export class WorkerJobCompleteRequestDTO extends createZodDto(resultSchema) {}

export type DiscriminatedWorkerJobCompleteRequestDTO = z.infer<
  typeof resultSchema
>
